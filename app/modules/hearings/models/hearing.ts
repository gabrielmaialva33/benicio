import { DateTime } from 'luxon'
import { belongsTo, column, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'

import TenantBaseModel from '#shared/models/tenant_base_model'
import Tenant from '#modules/tenants/models/tenant'
import User from '#modules/users/models/user'
import LegalProcess from '#modules/processes/models/process'
import type { HearingStatus, HearingType } from '#modules/hearings/interfaces/hearing_interface'

export default class Hearing extends TenantBaseModel {
  static table = 'hearings'

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  @column()
  declare process_id: number

  @column()
  declare creator_id: number

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare type: HearingType

  @column()
  declare status: HearingStatus

  @column.dateTime()
  declare starts_at: DateTime

  @column.dateTime()
  declare ends_at: DateTime | null

  @column.dateTime()
  declare completed_at: DateTime | null

  @column()
  declare location: string | null

  @column()
  declare online_url: string | null

  @column()
  declare judge: string | null

  @column()
  declare notes: string | null

  @column()
  declare result: string | null

  @column()
  declare metadata: Record<string, unknown>

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

  @belongsTo(() => LegalProcess, { foreignKey: 'process_id' })
  declare process: BelongsTo<typeof LegalProcess>

  @belongsTo(() => User, { foreignKey: 'creator_id' })
  declare creator: BelongsTo<typeof User>

  @manyToMany(() => User, {
    pivotTable: 'hearing_attendees',
    pivotForeignKey: 'hearing_id',
    pivotRelatedForeignKey: 'user_id',
    pivotColumns: ['tenant_id', 'role', 'is_required'],
    pivotTimestamps: true,
  })
  declare attendees: ManyToMany<typeof User>
}
