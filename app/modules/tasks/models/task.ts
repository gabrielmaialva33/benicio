import { DateTime } from 'luxon'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import TenantBaseModel from '#shared/models/tenant_base_model'
import Tenant from '#modules/tenants/models/tenant'
import User from '#modules/users/models/user'
import Folder from '#modules/folders/models/folder'
import LegalProcess from '#modules/processes/models/process'
import type { TaskPriority, TaskStatus } from '#modules/tasks/interfaces/task_interface'

export default class Task extends TenantBaseModel {
  static table = 'tasks'

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  @column()
  declare folder_id: number | null

  @column()
  declare process_id: number | null

  @column()
  declare assignee_id: number | null

  @column()
  declare creator_id: number

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare status: TaskStatus

  @column()
  declare priority: TaskPriority

  @column.dateTime()
  declare due_date: DateTime | null

  @column.dateTime()
  declare completed_at: DateTime | null

  @column({
    prepare: (value: string[]) => JSON.stringify(value),
    consume: (value: string[] | string) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare tags: string[]

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

  @belongsTo(() => User, { foreignKey: 'assignee_id' })
  declare assignee: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'creator_id' })
  declare creator: BelongsTo<typeof User>
}
