import { randomUUID } from 'node:crypto'

import aiConfig from '#config/ai'
import ServiceUnavailableException from '#exceptions/service_unavailable_exception'

type EmbeddingInputType = 'passage' | 'query'

interface NvidiaRetrievalOptions {
  apiKey?: string
  embeddingModel: string
  embeddingUrl: string
  rerankModel: string
  rerankUrl: string
  dimensions: number
  timeoutMs: number
  batchSize: number
}

interface EmbeddingRow {
  index: number
  embedding: number[]
}

export interface RerankResult {
  index: number
  score: number
}

export type AiRetrievalErrorCode = 'http' | 'invalid_response' | 'network' | 'timeout'

export class AiRetrievalRequestError extends Error {
  constructor(
    message: string,
    readonly code: AiRetrievalErrorCode,
    readonly status?: number,
    readonly requestId?: string
  ) {
    super(message)
    this.name = 'AiRetrievalRequestError'
  }

  get retryable(): boolean {
    if (this.code === 'network' || this.code === 'timeout') return true
    return (
      this.code === 'http' &&
      !!this.status &&
      (this.status === 408 || this.status === 429 || this.status >= 500)
    )
  }
}

export default class NvidiaRetrievalProvider {
  constructor(
    private readonly options: NvidiaRetrievalOptions = aiConfig.retrieval,
    private readonly fetcher: typeof globalThis.fetch = globalThis.fetch
  ) {}

  get embeddingModel(): string {
    return this.options.embeddingModel
  }

  async embedMany(texts: string[], inputType: EmbeddingInputType): Promise<number[][]> {
    if (!texts.length) return []
    this.requireApiKey()

    const vectors: number[][] = []
    for (let offset = 0; offset < texts.length; offset += this.options.batchSize) {
      const batch = texts.slice(offset, offset + this.options.batchSize)
      const payload = await this.requestJson(this.options.embeddingUrl, {
        model: this.options.embeddingModel,
        input: batch,
        input_type: inputType,
        encoding_format: 'float',
        truncate: 'END',
      })
      vectors.push(...this.parseEmbeddings(payload, batch.length))
    }
    return vectors
  }

  async rerank(query: string, passages: string[]): Promise<RerankResult[]> {
    if (!passages.length) return []
    if (passages.length === 1) return [{ index: 0, score: 0 }]
    this.requireApiKey()

    const payload = await this.requestJson(this.options.rerankUrl, {
      model: this.options.rerankModel,
      query: { text: query },
      passages: passages.map((text) => ({ text })),
      truncate: 'END',
    })
    return this.parseRankings(payload, passages.length)
  }

  private requireApiKey(): string {
    const apiKey = this.options.apiKey?.trim()
    if (!apiKey) throw new ServiceUnavailableException('AI retrieval provider is not configured')
    return apiKey
  }

  private async requestJson(url: string, body: Record<string, unknown>): Promise<unknown> {
    let lastError: unknown
    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs)
      try {
        const response = await this.fetcher(url, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.requireApiKey()}`,
            'Content-Type': 'application/json',
            'X-Client-Request-Id': randomUUID(),
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
        if (!response.ok) {
          await response.body?.cancel()
          throw new AiRetrievalRequestError(
            `AI retrieval request failed with status ${response.status}`,
            'http',
            response.status,
            response.headers.get('x-request-id') ?? response.headers.get('cf-ray') ?? undefined
          )
        }
        return (await response.json()) as unknown
      } catch (error) {
        lastError = this.normalizeError(error, controller.signal.aborted)
        if (
          !(lastError instanceof AiRetrievalRequestError) ||
          !lastError.retryable ||
          attempt === 2
        ) {
          throw lastError
        }
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt))
      } finally {
        clearTimeout(timeout)
      }
    }
    throw lastError
  }

  private parseEmbeddings(payload: unknown, expected: number): number[][] {
    if (!this.isRecord(payload) || !Array.isArray(payload.data)) {
      throw new AiRetrievalRequestError(
        'AI embedding provider returned an invalid response',
        'invalid_response'
      )
    }

    const rows: EmbeddingRow[] = payload.data.map((value: unknown, fallbackIndex: number) => {
      if (!this.isRecord(value) || !Array.isArray(value.embedding)) {
        throw new AiRetrievalRequestError(
          'AI embedding provider returned an invalid vector',
          'invalid_response'
        )
      }
      const embedding = value.embedding
      if (
        embedding.length !== this.options.dimensions ||
        embedding.some((item) => typeof item !== 'number' || !Number.isFinite(item))
      ) {
        throw new AiRetrievalRequestError(
          'AI embedding dimensions do not match the configured index',
          'invalid_response'
        )
      }
      return {
        index: typeof value.index === 'number' ? value.index : fallbackIndex,
        embedding: embedding as number[],
      }
    })
    rows.sort((left, right) => left.index - right.index)
    if (rows.length !== expected || rows.some((row, index) => row.index !== index)) {
      throw new AiRetrievalRequestError(
        'AI embedding provider returned an incomplete batch',
        'invalid_response'
      )
    }
    return rows.map((row) => row.embedding)
  }

  private parseRankings(payload: unknown, passageCount: number): RerankResult[] {
    if (!this.isRecord(payload) || !Array.isArray(payload.rankings)) {
      throw new AiRetrievalRequestError(
        'AI reranker returned an invalid response',
        'invalid_response'
      )
    }

    const seen = new Set<number>()
    const rankings = payload.rankings.map((value: unknown) => {
      if (
        !this.isRecord(value) ||
        typeof value.index !== 'number' ||
        !Number.isInteger(value.index) ||
        value.index < 0 ||
        value.index >= passageCount ||
        seen.has(value.index) ||
        typeof value.logit !== 'number' ||
        !Number.isFinite(value.logit)
      ) {
        throw new AiRetrievalRequestError(
          'AI reranker returned invalid rankings',
          'invalid_response'
        )
      }
      seen.add(value.index)
      return { index: value.index, score: value.logit }
    })
    if (rankings.length !== passageCount) {
      throw new AiRetrievalRequestError(
        'AI reranker returned an incomplete ranking',
        'invalid_response'
      )
    }
    return rankings
  }

  private normalizeError(error: unknown, aborted: boolean): AiRetrievalRequestError {
    if (error instanceof AiRetrievalRequestError) return error
    if (aborted || (error instanceof Error && error.name === 'AbortError')) {
      return new AiRetrievalRequestError('AI retrieval request timed out', 'timeout')
    }
    return new AiRetrievalRequestError('AI retrieval request failed', 'network')
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
}
