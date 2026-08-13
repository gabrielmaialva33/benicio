import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import Tenant from '#modules/tenants/models/tenant'
import LegalProcess from '#modules/processes/models/process'
import type {
  ProcessPartyPersonType,
  ProcessPartySide,
} from '#modules/processes/interfaces/process_interface'

export default class ProcessParty extends BaseModel {
  static table = 'process_parties'
  static namingStrategy = new SnakeCaseNamingStrategy()

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tenant_id: number

  @column()
  declare process_id: number

  @column()
  declare side: ProcessPartySide

  @column()
  declare role: string | null

  @column()
  declare is_primary: boolean

  @column()
  declare name: string

  @column()
  declare document: string | null

  @column()
  declare person_type: ProcessPartyPersonType | null

  @column()
  declare metadata: Record<string, unknown>

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => Tenant, { foreignKey: 'tenant_id' })
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => LegalProcess, { foreignKey: 'process_id' })
  declare process: BelongsTo<typeof LegalProcess>
}
