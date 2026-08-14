import { createHash } from 'node:crypto'

import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import aiConfig from '#config/ai'
import type {
  AiDocumentChunkInput,
  AiDocumentIndexSummary,
  AiDocumentSource,
  AiKnowledgeScope,
  AiVectorPoint,
} from '#modules/ai/interfaces/ai_interface'
import NvidiaRetrievalProvider, {
  AiRetrievalRequestError,
} from '#modules/ai/providers/nvidia_retrieval_provider'
import AiKnowledgeRepository from '#modules/ai/repositories/ai_knowledge_repository'
import AiVectorRepository from '#modules/ai/repositories/ai_vector_repository'
import DocumentContentService from '#modules/ai/services/document_content_service'

interface PreparedSource {
  source: AiDocumentSource
  sourceHash: string
  chunks: Array<{
    content: string
    contentHash: string
    metadata: Record<string, unknown>
  }>
}

interface IndexOptions {
  failFast?: boolean
}

@inject()
export default class AiDocumentIndexService {
  constructor(
    private readonly knowledgeRepository: AiKnowledgeRepository,
    private readonly vectorRepository: AiVectorRepository,
    private readonly retrievalProvider: NvidiaRetrievalProvider,
    private readonly contentService: DocumentContentService
  ) {}

  async indexDocument(tenantId: number, documentId: number): Promise<boolean> {
    const summary = await this.indexScope(
      tenantId,
      { document_ids: [documentId] },
      { failFast: true }
    )
    return summary.indexed + summary.unchanged > 0
  }

  async removeDocument(tenantId: number, documentId: number): Promise<void> {
    await this.knowledgeRepository.deleteDocumentChunks(
      tenantId,
      documentId,
      this.retrievalProvider.embeddingModel
    )
    await this.vectorRepository.deleteDocument(
      tenantId,
      documentId,
      this.retrievalProvider.embeddingModel
    )
  }

  async indexScope(
    tenantId: number,
    scope: AiKnowledgeScope = {},
    options: IndexOptions = {}
  ): Promise<AiDocumentIndexSummary> {
    const sources = await this.knowledgeRepository.listSources(tenantId, scope)
    const summary: AiDocumentIndexSummary = {
      scanned: sources.length,
      indexed: 0,
      unchanged: 0,
      failed: 0,
    }
    if (!sources.length) return summary

    const indexedHashes = await this.knowledgeRepository.sourceHashes(
      tenantId,
      sources.map((source) => source.id),
      this.retrievalProvider.embeddingModel
    )
    const changed = sources.filter(
      (source) => indexedHashes.get(source.id) !== this.sourceFingerprint(source)
    )
    summary.unchanged = sources.length - changed.length

    for (let offset = 0; offset < changed.length; offset += 10) {
      const batch = changed.slice(offset, offset + 10)
      const prepared: PreparedSource[] = []

      for (const source of batch) {
        try {
          prepared.push(await this.prepareSource(tenantId, source))
        } catch (error) {
          await this.recordFailure(tenantId, source, 'content_extraction_failed', error)
          summary.failed++
          if (options.failFast) throw error
        }
      }
      if (!prepared.length) continue

      let vectors: number[][]
      try {
        vectors = await this.embedPreparedSources(tenantId, prepared)
      } catch (error) {
        for (const item of prepared) {
          await this.recordFailure(tenantId, item.source, 'embedding_provider_failed', error)
          summary.failed++
        }
        if (options.failFast) throw error
        continue
      }

      let vectorOffset = 0
      for (const item of prepared) {
        const itemVectors = vectors.slice(vectorOffset, vectorOffset + item.chunks.length)
        vectorOffset += item.chunks.length
        try {
          await this.persistSourceIndex(tenantId, item, itemVectors)
          summary.indexed++
        } catch (error) {
          summary.failed++
          if (options.failFast) throw error
        }
      }
    }

    return summary
  }

  private async prepareSource(tenantId: number, source: AiDocumentSource): Promise<PreparedSource> {
    const extracted = await this.contentService.extract(source)
    if (extracted.warnings.includes('file_content_unavailable')) {
      throw new Error(`Document ${source.id} content is unavailable for semantic indexing`)
    }
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

    const canonical = this.canonicalText(source, extracted.text)
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
      throw error
    }
  }

  private async persistSourceIndex(
    tenantId: number,
    prepared: PreparedSource,
    vectors: number[][]
  ): Promise<void> {
    if (vectors.length !== prepared.chunks.length) {
      throw new Error('Semantic indexing provider returned an incomplete batch')
    }

    const dbChunks = this.buildChunkInputs(tenantId, prepared)
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
      const marked = await this.knowledgeRepository.markDocumentIndexed(
        tenantId,
        prepared.source.id,
        this.retrievalProvider.embeddingModel,
        prepared.sourceHash
      )
      if (marked !== dbChunks.length) {
        await this.vectorRepository.deleteDocument(
          tenantId,
          prepared.source.id,
          this.retrievalProvider.embeddingModel
        )
        throw new Error('Legal document changed or was deleted while its index was being written')
      }
    } catch (error) {
      await this.markFailedSafely(
        tenantId,
        prepared.source.id,
        prepared.sourceHash,
        'qdrant_synchronization_failed'
      )
      logger.error(
        { err: error, tenantId, documentId: prepared.source.id },
        'Qdrant document synchronization failed'
      )
      throw error
    }
  }

  private async recordFailure(
    tenantId: number,
    source: AiDocumentSource,
    code: string,
    error: unknown
  ): Promise<void> {
    const sourceHash = this.sourceFingerprint(source)
    const content = this.canonicalText(source, '')
    const contentHash = this.sha256(content)
    const chunk: AiDocumentChunkInput = {
      qdrantPointId: this.pointId(tenantId, source.id, sourceHash, contentHash, 0),
      chunkIndex: 0,
      content,
      contentHash,
      metadata: {
        document_id: source.id,
        folder_id: source.folder_id,
        title: source.title,
        index_failure: code,
      },
    }

    try {
      await this.knowledgeRepository.replaceDocumentChunks(
        tenantId,
        source,
        sourceHash,
        this.retrievalProvider.embeddingModel,
        [chunk]
      )
      await this.markFailedSafely(tenantId, source.id, sourceHash, code)
    } catch (stateError) {
      logger.error(
        { err: stateError, tenantId, documentId: source.id },
        'Failed to persist semantic indexing error state'
      )
    }

    logger.error(
      {
        tenantId,
        documentId: source.id,
        operation: code,
        errorName: error instanceof Error ? error.name : 'unknown',
      },
      'Legal document semantic indexing failed'
    )
  }

  private async markFailedSafely(
    tenantId: number,
    documentId: number,
    sourceHash: string,
    code: string
  ): Promise<void> {
    try {
      await this.knowledgeRepository.markDocumentIndexFailed(
        tenantId,
        documentId,
        this.retrievalProvider.embeddingModel,
        sourceHash,
        code
      )
    } catch (error) {
      logger.error(
        { err: error, tenantId, documentId },
        'Failed to persist semantic indexing error state'
      )
    }
  }

  private buildChunkInputs(tenantId: number, prepared: PreparedSource): AiDocumentChunkInput[] {
    return prepared.chunks.map((chunk, index) => ({
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
  }

  private canonicalText(source: AiDocumentSource, extractedText: string): string {
    return [
      `Título: ${source.title}`,
      source.description ? `Descrição: ${source.description}` : '',
      extractedText ? `Conteúdo:\n${extractedText}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')
      .trim()
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
