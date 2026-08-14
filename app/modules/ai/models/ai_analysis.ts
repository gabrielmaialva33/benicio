import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import Tenant from '#modules/tenants/models/tenant'
import User from '#modules/users/models/user'
import Folder from '#modules/folders/models/folder'
import LegalDocument from '#modules/documents/models/legal_document'
import type {
  AiAnalysisStatus,
  AiAnalysisType,
  AiProfile,
} from '#modules/ai/interfaces/ai_interface'

export default class AiAnalysis extends BaseModel {
  static table = 'ai_analyses'
  static namingStrategy = new SnakeCaseNamingStrategy()

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tenant_id: number

  @column()
  declare document_id: number | null

  @column()
  declare folder_id: number | null

  @column()
  declare user_id: number

  @column()
  declare analysis_type: AiAnalysisType

  @column()
  declare profile: AiProfile

  @column()
  declare provider: string | null

  @column()
  declare model: string | null

  @column()
  declare status: AiAnalysisStatus

  @column()
  declare result: Record<string, unknown>

  @column()
  declare error: Record<string, unknown> | null

  @column()
  declare tokens_used: number | null

  @column()
  declare processing_time_ms: number | null

  @column()
  declare metadata: Record<string, unknown>

  @column.dateTime()
  declare completed_at: DateTime | null

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

  @belongsTo(() => User, { foreignKey: 'user_id' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Folder, { foreignKey: 'folder_id' })
  declare folder: BelongsTo<typeof Folder>

  @belongsTo(() => LegalDocument, { foreignKey: 'document_id' })
  declare document: BelongsTo<typeof LegalDocument>
}
