import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import aiConfig from '#config/ai'
import BadGatewayException from '#exceptions/bad_gateway_exception'
import type {
  AiSemanticSearchResult,
  SemanticSearchInput,
} from '#modules/ai/interfaces/ai_interface'
import NvidiaRetrievalProvider, {
  AiRetrievalRequestError,
} from '#modules/ai/providers/nvidia_retrieval_provider'
import AiKnowledgeRepository from '#modules/ai/repositories/ai_knowledge_repository'
import AiVectorRepository from '#modules/ai/repositories/ai_vector_repository'

@inject()
export default class AiSemanticSearchService {
  constructor(
    private readonly knowledgeRepository: AiKnowledgeRepository,
    private readonly vectorRepository: AiVectorRepository,
    private readonly retrievalProvider: NvidiaRetrievalProvider
  ) {}

  async search(tenantId: number, input: SemanticSearchInput): Promise<AiSemanticSearchResult[]> {
    let queryVector: number[]
    try {
      const vectors = await this.retrievalProvider.embedMany([input.query], 'query')
      queryVector = vectors[0]
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
        this.retrievalProvider.embeddingModel,
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
