import { DateTime } from 'luxon'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import TenantBaseModel from '#shared/models/tenant_base_model'
import Tenant from '#modules/tenants/models/tenant'
import Client from '#modules/clients/models/client'
import User from '#modules/users/models/user'
import type { FolderStatus } from '#modules/folders/interfaces/folder_interface'

export default class Folder extends TenantBaseModel {
  static table = 'folders'

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  @column()
  declare code: string

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare status: FolderStatus

  @column()
  declare area: string

  @column()
  declare subarea: string | null

  @column()
  declare client_id: number

  @column()
  declare responsible_lawyer_id: number | null

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

  @belongsTo(() => Client, { foreignKey: 'client_id' })
  declare client: BelongsTo<typeof Client>

  @belongsTo(() => User, { foreignKey: 'responsible_lawyer_id' })
  declare responsible_lawyer: BelongsTo<typeof User>
}
