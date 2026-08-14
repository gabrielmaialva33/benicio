import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import Tenant from '#modules/tenants/models/tenant'
import AiConversation from '#modules/ai/models/ai_conversation'
import type { AiMessageRole } from '#modules/ai/interfaces/ai_interface'

export default class AiMessage extends BaseModel {
  static table = 'ai_messages'
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
  declare conversation_id: number

  @column()
  declare role: AiMessageRole

  @column()
  declare content: string

  @column()
  declare provider: string | null

  @column()
  declare model: string | null

  @column()
  declare usage: Record<string, unknown>

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  /**
   * ------------------------------------------------------
   * Relationships
   * ------------------------------------------------------
   */
  @belongsTo(() => Tenant, { foreignKey: 'tenant_id' })
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => AiConversation, { foreignKey: 'conversation_id' })
  declare conversation: BelongsTo<typeof AiConversation>
}
