import { DateTime } from 'luxon'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

import TenantBaseModel from '#shared/models/tenant_base_model'
import Tenant from '#modules/tenants/models/tenant'
import Folder from '#modules/folders/models/folder'
import type { ClientAddress, ClientPersonType } from '#modules/clients/interfaces/client_interface'

export default class Client extends TenantBaseModel {
  static table = 'clients'

  @column()
  declare name: string

  @column()
  declare document: string

  @column()
  declare person_type: ClientPersonType

  @column()
  declare email: string | null

  @column()
  declare phone: string | null

  @column()
  declare address: ClientAddress | null

  @column()
  declare notes: string | null

  @column()
  declare metadata: Record<string, unknown>

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => Tenant, { foreignKey: 'tenant_id' })
  declare tenant: BelongsTo<typeof Tenant>

  @hasMany(() => Folder, { foreignKey: 'client_id' })
  declare folders: HasMany<typeof Folder>
}
