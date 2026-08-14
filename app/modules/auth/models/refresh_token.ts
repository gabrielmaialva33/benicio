import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import Tenant from '#modules/tenants/models/tenant'
import User from '#modules/users/models/user'

export default class RefreshToken extends BaseModel {
  static table = 'refresh_tokens'
  static namingStrategy = new SnakeCaseNamingStrategy()

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare family_id: string

  @column()
  declare user_id: number

  @column()
  declare tenant_id: number | null

  @column({ serializeAs: null })
  declare token_hash: string

  @column()
  declare replaced_by_id: string | null

  @column.dateTime()
  declare expires_at: DateTime

  @column.dateTime()
  declare used_at: DateTime | null

  @column.dateTime()
  declare revoked_at: DateTime | null

  @column()
  declare revoked_reason: string | null

  @column()
  declare created_ip: string | null

  @column()
  declare user_agent: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  /**
   * ------------------------------------------------------
   * Relationships
   * ------------------------------------------------------
   */
  @belongsTo(() => User, { foreignKey: 'user_id' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Tenant, { foreignKey: 'tenant_id' })
  declare tenant: BelongsTo<typeof Tenant>
}
