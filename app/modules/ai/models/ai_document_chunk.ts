import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import Tenant from '#modules/tenants/models/tenant'
import Folder from '#modules/folders/models/folder'
import LegalDocument from '#modules/documents/models/legal_document'

export default class AiDocumentChunk extends BaseModel {
  static table = 'ai_document_chunks'
  static namingStrategy = new SnakeCaseNamingStrategy()

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare qdrant_point_id: string

  @column()
  declare tenant_id: number

  @column()
  declare document_id: number

  @column()
  declare folder_id: number

  @column()
  declare chunk_index: number

  @column()
  declare content: string

  @column()
  declare content_hash: string

  @column()
  declare source_hash: string

  @column()
  declare embedding_model: string

  @column()
  declare index_status: 'pending' | 'indexed' | 'failed'

  @column.dateTime()
  declare indexed_at: DateTime | null

  @column()
  declare index_error: string | null

  @column()
  declare metadata: Record<string, unknown>

  @column.dateTime()
  declare source_updated_at: DateTime

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  /**
   * ------------------------------------------------------
   * Relationships
   * ------------------------------------------------------
   */
  @belongsTo(() => Tenant, { foreignKey: 'tenant_id' })
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => Folder, { foreignKey: 'folder_id' })
  declare folder: BelongsTo<typeof Folder>

  @belongsTo(() => LegalDocument, { foreignKey: 'document_id' })
  declare document: BelongsTo<typeof LegalDocument>
}
