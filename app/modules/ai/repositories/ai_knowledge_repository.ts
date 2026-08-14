import db from '@adonisjs/lucid/services/db'

import LegalDocument from '#modules/documents/models/legal_document'
import type {
  AiDocumentChunkInput,
  AiDocumentSource,
  AiKnowledgeScope,
  AiVectorCandidate,
  SemanticSearchInput,
} from '#modules/ai/interfaces/ai_interface'

interface ChunkSearchRow {
  id: string | number
  qdrant_point_id: string
  document_id: number
  folder_id: number
  content: string
  metadata: Record<string, unknown>
}

export interface StoredChunkSearchResult {
  id: string
  qdrantPointId: string
  documentId: number
  folderId: number
  content: string
  similarity: number
  metadata: Record<string, unknown>
}

export default class AiKnowledgeRepository {
  async findSource(tenantId: number, documentId: number): Promise<AiDocumentSource | null> {
    const sources = await this.listSources(tenantId, {
      document_ids: [documentId],
    })
    return sources[0] ?? null
  }

  async listSources(tenantId: number, input: AiKnowledgeScope): Promise<AiDocumentSource[]> {
    const query = LegalDocument.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .select('id', 'folder_id', 'file_id', 'title', 'description', 'metadata', 'updated_at')
      .preload('file', (fileQuery) => {
        fileQuery.select('id', 'file_name', 'file_type', 'file_size', 'storage_disk', 'updated_at')
      })
      .orderBy('id', 'asc')

    if (input.folder_id) query.where('folder_id', input.folder_id)
    if (input.document_ids?.length) query.whereIn('id', input.document_ids)

    const documents = await query
    return documents.map((document) => ({
      id: document.id,
      folder_id: document.folder_id,
      file_id: document.file_id,
      title: document.title,
      description: document.description,
      metadata: document.metadata,
      updated_at: document.updated_at.toUTC().toISO()!,
      file_name: document.file.file_name,
      file_type: document.file.file_type,
      file_size: document.file.file_size,
      storage_disk: document.file.storage_disk,
      file_updated_at: document.file.updated_at.toUTC().toISO()!,
    }))
  }

  async listActiveTenantIds(): Promise<number[]> {
    const rows = await db.from('tenants').where('is_active', true).orderBy('id').select('id')
    return rows.map((row) => Number(row.id))
  }

  async sourceHashes(
    tenantId: number,
    documentIds: number[],
    embeddingModel: string
  ): Promise<Map<number, string>> {
    if (!documentIds.length) return new Map()

    const rows = await db
      .from('ai_document_chunks')
      .where('tenant_id', tenantId)
      .where('embedding_model', embeddingModel)
      .whereIn('document_id', documentIds)
      .select('document_id')
      .min('source_hash as source_hash')
      .groupBy('document_id')
      .havingRaw(`COUNT(*) = COUNT(*) FILTER (WHERE index_status = 'indexed')`)
      .havingRaw('COUNT(DISTINCT source_hash) = 1')

    return new Map(rows.map((row) => [Number(row.document_id), String(row.source_hash)]))
  }

  async replaceDocumentChunks(
    tenantId: number,
    source: AiDocumentSource,
    sourceHash: string,
    embeddingModel: string,
    chunks: AiDocumentChunkInput[]
  ): Promise<void> {
    await db.transaction(async (trx) => {
      await trx
        .from('legal_documents')
        .where({ tenant_id: tenantId, id: source.id })
        .whereNull('deleted_at')
        .forUpdate()
        .firstOrFail()

      await trx
        .from('ai_document_chunks')
        .where({
          tenant_id: tenantId,
          document_id: source.id,
          embedding_model: embeddingModel,
        })
        .delete()

      await trx.table('ai_document_chunks').multiInsert(
        chunks.map((chunk) => ({
          qdrant_point_id: chunk.qdrantPointId,
          tenant_id: tenantId,
          document_id: source.id,
          folder_id: source.folder_id,
          chunk_index: chunk.chunkIndex,
          content: chunk.content,
          content_hash: chunk.contentHash,
          source_hash: sourceHash,
          embedding_model: embeddingModel,
          index_status: 'pending',
          indexed_at: null,
          index_error: null,
          metadata: JSON.stringify(chunk.metadata),
          source_updated_at: source.updated_at,
          created_at: new Date(),
          updated_at: new Date(),
        }))
      )
    })
  }

  async markDocumentIndexed(
    tenantId: number,
    documentId: number,
    embeddingModel: string,
    sourceHash: string
  ): Promise<number> {
    const updated = await db
      .from('ai_document_chunks')
      .where({
        tenant_id: tenantId,
        document_id: documentId,
        embedding_model: embeddingModel,
        source_hash: sourceHash,
      })
      .update({
        index_status: 'indexed',
        indexed_at: new Date(),
        index_error: null,
        updated_at: new Date(),
      })
    return Number(updated)
  }

  async markDocumentIndexFailed(
    tenantId: number,
    documentId: number,
    embeddingModel: string,
    sourceHash: string,
    error: string
  ): Promise<void> {
    await db
      .from('ai_document_chunks')
      .where({
        tenant_id: tenantId,
        document_id: documentId,
        embedding_model: embeddingModel,
        source_hash: sourceHash,
      })
      .update({
        index_status: 'failed',
        index_error: error.slice(0, 500),
        indexed_at: null,
        updated_at: new Date(),
      })
  }

  async deleteDocumentChunks(
    tenantId: number,
    documentId: number,
    embeddingModel: string
  ): Promise<void> {
    await db
      .from('ai_document_chunks')
      .where({
        tenant_id: tenantId,
        document_id: documentId,
        embedding_model: embeddingModel,
      })
      .delete()
  }

  async hydrateCandidates(
    tenantId: number,
    embeddingModel: string,
    candidates: AiVectorCandidate[],
    input: SemanticSearchInput
  ): Promise<StoredChunkSearchResult[]> {
    if (!candidates.length) return []

    const pointIds = candidates.map((candidate) => candidate.pointId)
    const query = db
      .from('ai_document_chunks as chunks')
      .innerJoin('legal_documents as documents', (join) => {
        join.on('documents.tenant_id', 'chunks.tenant_id').on('documents.id', 'chunks.document_id')
      })
      .where('chunks.tenant_id', tenantId)
      .where('chunks.embedding_model', embeddingModel)
      .where('chunks.index_status', 'indexed')
      .whereNull('documents.deleted_at')
      .whereIn('chunks.qdrant_point_id', pointIds)
      .select(
        'chunks.id',
        'chunks.qdrant_point_id',
        'chunks.document_id',
        'chunks.folder_id',
        'chunks.content',
        'chunks.metadata'
      )

    if (input.folder_id) query.where('chunks.folder_id', input.folder_id)
    if (input.document_ids?.length) query.whereIn('chunks.document_id', input.document_ids)

    const rows = (await query) as ChunkSearchRow[]
    const rowsByPointId = new Map(rows.map((row) => [row.qdrant_point_id, row]))

    return candidates.flatMap((candidate) => {
      const row = rowsByPointId.get(candidate.pointId)
      if (!row) return []
      return [
        {
          id: String(row.id),
          qdrantPointId: row.qdrant_point_id,
          documentId: Number(row.document_id),
          folderId: Number(row.folder_id),
          content: row.content,
          similarity: candidate.score,
          metadata: row.metadata,
        },
      ]
    })
  }
}
