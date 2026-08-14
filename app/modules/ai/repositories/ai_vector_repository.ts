import { QdrantClient } from '@qdrant/js-client-rest'

import qdrantConfig from '#config/qdrant'
import type {
  AiVectorCandidate,
  AiVectorPoint,
  SemanticSearchInput,
} from '#modules/ai/interfaces/ai_interface'

export default class AiVectorRepository {
  private readonly client = new QdrantClient({
    url: qdrantConfig.url,
    apiKey: qdrantConfig.apiKey,
    timeout: qdrantConfig.timeoutMs,
    checkCompatibility: true,
  })

  private collectionPromise?: Promise<void>

  ensureCollection(): Promise<void> {
    this.collectionPromise ??= this.prepareCollection().catch((error: unknown) => {
      this.collectionPromise = undefined
      throw error
    })
    return this.collectionPromise
  }

  async replaceDocument(points: AiVectorPoint[]): Promise<void> {
    if (!points.length) return
    await this.ensureCollection()

    const first = points[0]
    await this.client.delete(qdrantConfig.collection, {
      wait: true,
      filter: this.documentFilter(first.tenantId, first.documentId, first.embeddingModel),
    })
    await this.client.upsert(qdrantConfig.collection, {
      wait: true,
      points: points.map((point) => {
        this.assertVector(point.vector)
        return {
          id: point.pointId,
          vector: point.vector,
          payload: {
            tenant_id: String(point.tenantId),
            document_id: point.documentId,
            folder_id: point.folderId,
            source_hash: point.sourceHash,
            embedding_model: point.embeddingModel,
          },
        }
      }),
    })
  }

  async search(
    tenantId: number,
    vector: number[],
    input: SemanticSearchInput,
    limit: number
  ): Promise<AiVectorCandidate[]> {
    this.assertVector(vector)
    await this.ensureCollection()

    const must: Array<Record<string, unknown>> = [
      { key: 'tenant_id', match: { value: String(tenantId) } },
    ]
    if (input.folder_id) must.push({ key: 'folder_id', match: { value: input.folder_id } })
    if (input.document_ids?.length) {
      must.push({ key: 'document_id', match: { any: input.document_ids } })
    }

    const result = await this.client.query(qdrantConfig.collection, {
      query: vector,
      filter: { must },
      limit,
      with_payload: false,
      with_vector: false,
    })

    return result.points.flatMap((point) => {
      if (typeof point.id !== 'string') return []
      return [{ pointId: point.id, score: point.score }]
    })
  }

  private async prepareCollection(): Promise<void> {
    const collections = await this.client.getCollections()
    const exists = collections.collections.some(({ name }) => name === qdrantConfig.collection)

    if (!exists) {
      await this.client.createCollection(qdrantConfig.collection, {
        vectors: { size: qdrantConfig.vectorSize, distance: 'Cosine' },
        on_disk_payload: true,
        metadata: {
          schema_version: 1,
        },
      })
    }

    const info = await this.client.getCollection(qdrantConfig.collection)
    const vectors = info.config.params.vectors
    if (!vectors || !('size' in vectors)) {
      throw new Error('Qdrant collection must use one unnamed dense vector')
    }
    if (vectors.size !== qdrantConfig.vectorSize || vectors.distance !== 'Cosine') {
      throw new Error(
        `Qdrant collection vector schema mismatch: expected ${qdrantConfig.vectorSize}/Cosine`
      )
    }

    const indexes: Array<[string, 'integer' | { type: 'keyword'; is_tenant?: boolean }]> = [
      ['tenant_id', { type: 'keyword', is_tenant: true }],
      ['document_id', 'integer'],
      ['folder_id', 'integer'],
      ['embedding_model', { type: 'keyword' }],
    ]
    for (const [fieldName, fieldSchema] of indexes) {
      if (info.payload_schema[fieldName]) continue
      await this.client.createPayloadIndex(qdrantConfig.collection, {
        wait: true,
        field_name: fieldName,
        field_schema: fieldSchema,
      })
    }
  }

  private documentFilter(tenantId: number, documentId: number, embeddingModel: string) {
    return {
      must: [
        { key: 'tenant_id', match: { value: String(tenantId) } },
        { key: 'document_id', match: { value: documentId } },
        { key: 'embedding_model', match: { value: embeddingModel } },
      ],
    }
  }

  private assertVector(vector: number[]): void {
    if (
      vector.length !== qdrantConfig.vectorSize ||
      vector.some((value) => !Number.isFinite(value))
    ) {
      throw new Error(`AI embedding must contain exactly ${qdrantConfig.vectorSize} finite values`)
    }
  }
}
