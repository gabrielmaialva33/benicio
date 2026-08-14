import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import Tenant from '#modules/tenants/models/tenant'
import User from '#modules/users/models/user'
import Folder from '#modules/folders/models/folder'
import LegalProcess from '#modules/processes/models/process'

export default class Activity extends BaseModel {
  static table = 'activities'
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
  declare folder_id: number

  @column()
  declare process_id: number | null

  @column()
  declare actor_id: number | null

  @column()
  declare event_type: string

  @column()
  declare summary: string

  @column()
  declare data: Record<string, unknown>

  @column.dateTime()
  declare occurred_at: DateTime

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  /**
   * ------------------------------------------------------
   * Relationships
   * ------------------------------------------------------
   */
  @belongsTo(() => Tenant, { foreignKey: 'tenant_id' })
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => Folder, { foreignKey: 'folder_id' })
  declare folder: BelongsTo<typeof Folder>

  @belongsTo(() => LegalProcess, { foreignKey: 'process_id' })
  declare process: BelongsTo<typeof LegalProcess>

  @belongsTo(() => User, { foreignKey: 'actor_id' })
  declare actor: BelongsTo<typeof User>
}
