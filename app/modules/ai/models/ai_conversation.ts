import { DateTime } from 'luxon'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

import TenantBaseModel from '#shared/models/tenant_base_model'
import Tenant from '#modules/tenants/models/tenant'
import User from '#modules/users/models/user'
import AiMessage from '#modules/ai/models/ai_message'
import type { AiConversationMode, AiConversationStatus } from '#modules/ai/interfaces/ai_interface'

export default class AiConversation extends TenantBaseModel {
  static table = 'ai_conversations'

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  @column()
  declare user_id: number

  @column()
  declare title: string

  @column()
  declare mode: AiConversationMode

  @column()
  declare status: AiConversationStatus

  @column()
  declare last_error: string | null

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

  @hasMany(() => AiMessage, { foreignKey: 'conversation_id' })
  declare messages: HasMany<typeof AiMessage>
}
