import { DateTime } from 'luxon'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import TenantBaseModel from '#shared/models/tenant_base_model'
import Tenant from '#modules/tenants/models/tenant'
import User from '#modules/users/models/user'
import Folder from '#modules/folders/models/folder'
import LegalProcess from '#modules/processes/models/process'
import File from '#modules/files/models/file'

export default class LegalDocument extends TenantBaseModel {
  static table = 'legal_documents'

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  @column()
  declare folder_id: number

  @column()
  declare process_id: number | null

  @column()
  declare file_id: number

  @column()
  declare created_by: number

  @column()
  declare document_type: string

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare version: number

  @column()
  declare is_signed: boolean

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

  @belongsTo(() => Folder, { foreignKey: 'folder_id' })
  declare folder: BelongsTo<typeof Folder>

  @belongsTo(() => LegalProcess, { foreignKey: 'process_id' })
  declare process: BelongsTo<typeof LegalProcess>

  @belongsTo(() => File, { foreignKey: 'file_id' })
  declare file: BelongsTo<typeof File>

  @belongsTo(() => User, { foreignKey: 'created_by' })
  declare creator: BelongsTo<typeof User>
}
