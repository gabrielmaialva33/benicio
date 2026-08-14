import { DateTime } from 'luxon'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import TenantBaseModel from '#shared/models/tenant_base_model'
import Tenant from '#modules/tenants/models/tenant'
import User from '#modules/users/models/user'
import type { NotificationType } from '#modules/notifications/interfaces/notification_interface'

export default class Notification extends TenantBaseModel {
  static table = 'notifications'

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  @column()
  declare recipient_id: number

  @column()
  declare actor_id: number | null

  @column()
  declare type: NotificationType

  @column()
  declare title: string

  @column()
  declare message: string

  @column.dateTime()
  declare read_at: DateTime | null

  @column()
  declare data: Record<string, unknown>

  @column()
  declare action_url: string | null

  @column()
  declare action_text: string | null

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

  @belongsTo(() => User, { foreignKey: 'recipient_id' })
  declare recipient: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'actor_id' })
  declare actor: BelongsTo<typeof User>
}
