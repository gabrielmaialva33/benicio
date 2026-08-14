import { createHash } from 'node:crypto'

import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import aiConfig from '#config/ai'
import BadGatewayException from '#exceptions/bad_gateway_exception'
import AiKnowledgeRepository from '#modules/ai/repositories/ai_knowledge_repository'
import AiVectorRepository from '#modules/ai/repositories/ai_vector_repository'
import NvidiaRetrievalProvider, {
  AiRetrievalRequestError,
} from '#modules/ai/providers/nvidia_retrieval_provider'
import DocumentContentService from '#modules/ai/services/document_content_service'
import type {
  AiDocumentChunkInput,
  AiDocumentSource,
  AiSemanticSearchResult,
  AiVectorPoint,
  SemanticSearchInput,
} from '#modules/ai/interfaces/ai_interface'

interface PreparedSource {
  source: AiDocumentSource
  sourceHash: string
  chunks: Array<{
    content: string
    contentHash: string
    metadata: Record<string, unknown>
  }>
}

@inject()
export default class AiSemanticSearchService {
  constructor(
    private readonly knowledgeRepository: AiKnowledgeRepository,
    private readonly vectorRepository: AiVectorRepository,
    private readonly retrievalProvider: NvidiaRetrievalProvider,
    private readonly contentService: DocumentContentService
  ) {}

  async search(tenantId: number, input: SemanticSearchInput): Promise<AiSemanticSearchResult[]> {
    const sources = await this.knowledgeRepository.listSources(tenantId, input)
    if (!sources.length) return []

    await this.synchronizeSources(tenantId, sources)

    let queryVector: number[]
    try {
      ;[queryVector] = await this.retrievalProvider.embedMany([input.query], 'query')
    } catch (error) {
      this.logRetrievalFailure(error, tenantId, 'query_embedding')
      throw new BadGatewayException('Semantic search provider request failed')
    }

    const limit = input.limit ?? 5
    const candidateLimit = Math.min(
      100,
      Math.max(20, limit * aiConfig.retrieval.candidateMultiplier)
    )
    let vectorCandidates
    try {
      vectorCandidates = await this.vectorRepository.search(
        tenantId,
        queryVector,
        input,
        candidateLimit
      )
    } catch (error) {
      logger.error(
        { err: error, tenantId, operation: 'vector_search' },
        'Qdrant semantic search failed'
      )
      throw new BadGatewayException('Semantic index is temporarily unavailable')
    }

    const hydrated = await this.knowledgeRepository.hydrateCandidates(
      tenantId,
      this.retrievalProvider.embeddingModel,
      vectorCandidates,
      input
    )
    if (!hydrated.length) return []

    let ranking
    try {
      ranking = await this.retrievalProvider.rerank(
        input.query,
        hydrated.map((candidate) => candidate.content)
      )
    } catch (error) {
      this.logRetrievalFailure(error, tenantId, 'rerank')
      throw new BadGatewayException('Semantic search reranking failed')
    }

    return ranking.slice(0, limit).map(({ index, score }) => {
      const candidate = hydrated[index]
      return {
        id: candidate.documentId,
        content: candidate.content,
        similarity: candidate.similarity,
        metadata: {
          ...candidate.metadata,
          document_id: candidate.documentId,
          folder_id: candidate.folderId,
          chunk_id: candidate.id,
          vector_score: candidate.similarity,
          rerank_score: score,
        },
      }
    })
  }

  private async synchronizeSources(tenantId: number, sources: AiDocumentSource[]): Promise<void> {
    const indexedHashes = await this.knowledgeRepository.sourceHashes(
      tenantId,
      sources.map((source) => source.id),
      this.retrievalProvider.embeddingModel
    )
    const changed = sources.filter(
      (source) => indexedHashes.get(source.id) !== this.sourceFingerprint(source)
    )

    for (let offset = 0; offset < changed.length; offset += 10) {
      const batch = changed.slice(offset, offset + 10)
      const prepared = await Promise.all(
        batch.map((source) => this.prepareSource(tenantId, source))
      )
      const vectors = await this.embedPreparedSources(tenantId, prepared)
      let vectorOffset = 0

      for (const item of prepared) {
        const itemVectors = vectors.slice(vectorOffset, vectorOffset + item.chunks.length)
        vectorOffset += item.chunks.length
        await this.persistSourceIndex(tenantId, item, itemVectors)
      }
    }
  }

  private async prepareSource(tenantId: number, source: AiDocumentSource): Promise<PreparedSource> {
    const extracted = await this.contentService.extract(source)
    if (extracted.warnings.length) {
      logger.warn(
        {
          tenantId,
          documentId: source.id,
          warnings: extracted.warnings,
          contentOrigin: extracted.origin,
        },
        'Legal document indexed with extraction warnings'
      )
    }

    const canonical = [
      `Título: ${source.title}`,
      source.description ? `Descrição: ${source.description}` : '',
      extracted.text ? `Conteúdo:\n${extracted.text}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')
      .trim()
    const chunks = this.chunkText(canonical).map((content, chunkIndex) => ({
      content,
      contentHash: this.sha256(content),
      metadata: {
        document_id: source.id,
        folder_id: source.folder_id,
        title: source.title,
        chunk_index: chunkIndex,
        content_origin: extracted.origin,
        extraction_warnings: extracted.warnings,
        content_truncated: extracted.truncated,
      },
    }))

    return {
      source,
      sourceHash: this.sourceFingerprint(source),
      chunks,
    }
  }

  private async embedPreparedSources(
    tenantId: number,
    prepared: PreparedSource[]
  ): Promise<number[][]> {
    try {
      return await this.retrievalProvider.embedMany(
        prepared.flatMap((item) => item.chunks.map((chunk) => chunk.content)),
        'passage'
      )
    } catch (error) {
      this.logRetrievalFailure(error, tenantId, 'passage_embedding')
      throw new BadGatewayException('Semantic indexing provider request failed')
    }
  }

  private async persistSourceIndex(
    tenantId: number,
    prepared: PreparedSource,
    vectors: number[][]
  ): Promise<void> {
    if (vectors.length !== prepared.chunks.length) {
      throw new BadGatewayException('Semantic indexing provider returned an incomplete batch')
    }

    const dbChunks: AiDocumentChunkInput[] = prepared.chunks.map((chunk, index) => ({
      qdrantPointId: this.pointId(
        tenantId,
        prepared.source.id,
        prepared.sourceHash,
        chunk.contentHash,
        index
      ),
      chunkIndex: index,
      content: chunk.content,
      contentHash: chunk.contentHash,
      metadata: chunk.metadata,
    }))
    const vectorPoints: AiVectorPoint[] = dbChunks.map((chunk, index) => ({
      pointId: chunk.qdrantPointId,
      tenantId,
      documentId: prepared.source.id,
      folderId: prepared.source.folder_id,
      sourceHash: prepared.sourceHash,
      embeddingModel: this.retrievalProvider.embeddingModel,
      vector: vectors[index],
    }))

    await this.knowledgeRepository.replaceDocumentChunks(
      tenantId,
      prepared.source,
      prepared.sourceHash,
      this.retrievalProvider.embeddingModel,
      dbChunks
    )

    try {
      await this.vectorRepository.replaceDocument(vectorPoints)
      await this.knowledgeRepository.markDocumentIndexed(
        tenantId,
        prepared.source.id,
        this.retrievalProvider.embeddingModel,
        prepared.sourceHash
      )
    } catch (error) {
      try {
        await this.knowledgeRepository.markDocumentIndexFailed(
          tenantId,
          prepared.source.id,
          this.retrievalProvider.embeddingModel,
          prepared.sourceHash,
          'Qdrant synchronization failed'
        )
      } catch (stateError) {
        logger.error(
          { err: stateError, tenantId, documentId: prepared.source.id },
          'Failed to persist Qdrant synchronization error state'
        )
      }
      logger.error(
        { err: error, tenantId, documentId: prepared.source.id },
        'Qdrant document synchronization failed'
      )
      throw new BadGatewayException('Semantic index is temporarily unavailable')
    }
  }

  private sourceFingerprint(source: AiDocumentSource): string {
    return this.sha256(
      this.stableJson({
        id: source.id,
        folder_id: source.folder_id,
        file_id: source.file_id,
        title: source.title,
        description: source.description,
        metadata: source.metadata,
        updated_at: source.updated_at,
        file_name: source.file_name,
        file_type: source.file_type,
        file_size: source.file_size,
        storage_disk: source.storage_disk,
        file_updated_at: source.file_updated_at,
        embedding_model: this.retrievalProvider.embeddingModel,
      })
    )
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = []
    const maxChars = aiConfig.retrieval.chunkChars
    const overlap = aiConfig.retrieval.chunkOverlapChars
    let start = 0

    while (start < text.length) {
      let end = Math.min(text.length, start + maxChars)
      if (end < text.length) {
        const minimumBoundary = start + Math.floor(maxChars * 0.7)
        const window = text.slice(minimumBoundary, end)
        const boundaries = ['\n\n', '\n', '. ', '; ', ' ']
        for (const boundary of boundaries) {
          const relative = window.lastIndexOf(boundary)
          if (relative >= 0) {
            end = minimumBoundary + relative + boundary.length
            break
          }
        }
      }

      const chunk = text.slice(start, end).trim()
      if (chunk) chunks.push(chunk)
      if (end >= text.length) break
      start = Math.max(start + 1, end - overlap)
    }

    return chunks.length ? chunks : ['Documento sem conteúdo textual extraível.']
  }

  private pointId(
    tenantId: number,
    documentId: number,
    sourceHash: string,
    contentHash: string,
    chunkIndex: number
  ): string {
    const hex = this.sha256(
      `${tenantId}:${documentId}:${this.retrievalProvider.embeddingModel}:${sourceHash}:${chunkIndex}:${contentHash}`
    ).slice(0, 32)
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`
  }

  private stableJson(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map((item) => this.stableJson(item)).join(',')}]`
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>
      return `{${Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${this.stableJson(record[key])}`)
        .join(',')}}`
    }
    return JSON.stringify(value) ?? 'null'
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }

  private logRetrievalFailure(error: unknown, tenantId: number, operation: string): void {
    logger.error(
      {
        tenantId,
        operation,
        errorName: error instanceof Error ? error.name : 'unknown',
        errorCode: error instanceof AiRetrievalRequestError ? error.code : undefined,
        status: error instanceof AiRetrievalRequestError ? error.status : undefined,
        requestId: error instanceof AiRetrievalRequestError ? error.requestId : undefined,
      },
      'NVIDIA retrieval request failed'
    )
  }
}
