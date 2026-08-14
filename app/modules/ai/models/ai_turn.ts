import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany, SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

import Tenant from '#modules/tenants/models/tenant'
import User from '#modules/users/models/user'
import AiConversation from '#modules/ai/models/ai_conversation'
import AiMessage from '#modules/ai/models/ai_message'
import type { AiProfile, AiTurnStatus } from '#modules/ai/interfaces/ai_interface'

export default class AiTurn extends BaseModel {
  static table = 'ai_turns'
  static namingStrategy = new SnakeCaseNamingStrategy()

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenant_id: number

  @column()
  declare conversation_id: number

  @column()
  declare user_id: number

  @column()
  declare idempotency_key: string | null

  @column()
  declare request_hash: string

  @column()
  declare profile: AiProfile

  @column()
  declare status: AiTurnStatus

  @column()
  declare error: string | null

  @column.dateTime()
  declare heartbeat_at: DateTime

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

  @belongsTo(() => AiConversation, { foreignKey: 'conversation_id' })
  declare conversation: BelongsTo<typeof AiConversation>

  @hasMany(() => AiMessage, { foreignKey: 'turn_id' })
  declare messages: HasMany<typeof AiMessage>
}
