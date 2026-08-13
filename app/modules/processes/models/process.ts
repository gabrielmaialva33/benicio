import { DateTime } from 'luxon'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

import TenantBaseModel from '#shared/models/tenant_base_model'
import Tenant from '#modules/tenants/models/tenant'
import ProcessParty from '#modules/processes/models/process_party'
import type {
  ProcessDistributionType,
  ProcessInstance,
  ProcessPhase,
  ProcessStatus,
} from '#modules/processes/interfaces/process_interface'

export default class LegalProcess extends TenantBaseModel {
  static table = 'processes'

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  @column()
  declare folder_id: number

  @column()
  declare cnj_number: string | null

  @column()
  declare cnj_year: number | null

  @column()
  declare cnj_segment: string | null

  @column()
  declare cnj_tribunal_code: string | null

  @column()
  declare cnj_origin_code: string | null

  @column()
  declare legacy_number: string | null

  @column()
  declare internal_code: string | null

  @column()
  declare status: ProcessStatus

  @column()
  declare instance: ProcessInstance | null

  @column()
  declare phase: ProcessPhase | null

  @column()
  declare distribution_type: ProcessDistributionType | null

  @column()
  declare electronic: boolean | null

  @column()
  declare is_primary: boolean

  @column()
  declare nature: string | null

  @column()
  declare action_type: string | null

  @column()
  declare tribunal: string | null

  @column()
  declare judicial_body: string | null

  @column()
  declare district: string | null

  @column()
  declare forum: string | null

  @column()
  declare court_division: string | null

  @column()
  declare judge: string | null

  // PostgreSQL numeric values stay strings to avoid precision loss in JavaScript.
  @column()
  declare case_value: string | null

  @column()
  declare conviction_value: string | null

  @column()
  declare costs: string | null

  @column()
  declare fees: string | null

  @column.date()
  declare distribution_date: DateTime | null

  @column.date()
  declare citation_date: DateTime | null

  @column.date()
  declare entry_date: DateTime | null

  @column()
  declare observation: string | null

  @column()
  declare object_detail: string | null

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

  @hasMany(() => ProcessParty, { foreignKey: 'process_id' })
  declare parties: HasMany<typeof ProcessParty>
}
