import db from '@adonisjs/lucid/services/db'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'

import Deadline from '#modules/deadlines/models/deadline'
import type {
  CreateDeadlineData,
  DeadlineListInput,
  UpdateDeadlineData,
} from '#modules/deadlines/interfaces/deadline_interface'

type ListOptions = Required<Pick<DeadlineListInput, 'page' | 'per_page' | 'sort_by' | 'order'>> &
  Omit<DeadlineListInput, 'page' | 'per_page' | 'sort_by' | 'order'>

export default class DeadlineRepository {
  async paginate(
    tenantId: number,
    options: ListOptions
  ): Promise<ModelPaginatorContract<Deadline>> {
    const query = Deadline.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .preload('assignee')
      .preload('creator')

    if (options.search) {
      query.where((search) =>
        search
          .whereILike('title', `%${options.search}%`)
          .orWhereILike('description', `%${options.search}%`)
          .orWhereILike('legal_basis', `%${options.search}%`)
      )
    }
    if (options.kind) query.where('kind', options.kind)
    if (options.status) query.where('status', options.status)
    if (options.priority) query.where('priority', options.priority)
    if (options.is_fatal !== undefined) query.where('is_fatal', options.is_fatal)
    if (options.folder_id) query.where('folder_id', options.folder_id)
    if (options.process_id) query.where('process_id', options.process_id)
    if (options.assignee_id) query.where('assignee_id', options.assignee_id)
    if (options.due_from) query.where('due_at', '>=', options.due_from)
    if (options.due_to) query.where('due_at', '<=', options.due_to)
    if (options.overdue) {
      query.whereNotIn('status', ['completed', 'cancelled']).where('due_at', '<', new Date())
    }

    return query.orderBy(options.sort_by, options.order).paginate(options.page, options.per_page)
  }

  async find(tenantId: number, deadlineId: number): Promise<Deadline | null> {
    return Deadline.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where('id', deadlineId)
      .preload('assignee')
      .preload('creator')
      .first()
  }

  async listOpenForFolder(tenantId: number, folderId: number, limit: number): Promise<Deadline[]> {
    return Deadline.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where('folder_id', folderId)
      .whereNotIn('status', ['completed', 'cancelled'])
      .preload('assignee')
      .orderBy('due_at', 'asc')
      .limit(limit)
  }

  findFolder(tenantId: number, folderId: number) {
    return db
      .from('folders')
      .where({ tenant_id: tenantId, id: folderId })
      .whereNull('deleted_at')
      .first()
  }

  findProcess(tenantId: number, processId: number) {
    return db
      .from('processes')
      .where({ tenant_id: tenantId, id: processId })
      .whereNull('deleted_at')
      .first()
  }

  async isUserInTenant(tenantId: number, userId: number): Promise<boolean> {
    const row = await db
      .from('user_tenants')
      .innerJoin('users', 'users.id', 'user_tenants.user_id')
      .where('user_tenants.tenant_id', tenantId)
      .where('user_tenants.user_id', userId)
      .where('users.is_deleted', false)
      .first()
    return row !== undefined && row !== null
  }

  async create(tenantId: number, creatorId: number, data: CreateDeadlineData): Promise<Deadline> {
    const status = data.status ?? 'pending'
    const deadline = await Deadline.create({
      tenant_id: tenantId,
      creator_id: creatorId,
      folder_id: data.folder_id!,
      process_id: data.process_id ?? null,
      assignee_id: data.assignee_id ?? null,
      title: data.title,
      description: data.description ?? null,
      kind: data.kind,
      status,
      priority: data.priority ?? 'medium',
      is_fatal: data.is_fatal ?? false,
      due_at: DateTime.fromJSDate(data.due_at),
      completed_at: status === 'completed' ? DateTime.now() : null,
      legal_basis: data.legal_basis ?? null,
      notes: data.notes ?? null,
      metadata: data.metadata ?? {},
    })
    return (await this.find(tenantId, deadline.id))!
  }

  async update(deadline: Deadline, data: UpdateDeadlineData): Promise<Deadline> {
    const { due_at: dueAt, metadata, folder_id: folderId, ...fields } = data
    const status = data.status ?? deadline.status
    deadline.merge({
      ...fields,
      folder_id: folderId ?? deadline.folder_id,
      due_at: dueAt ? DateTime.fromJSDate(dueAt) : deadline.due_at,
      completed_at: status === 'completed' ? (deadline.completed_at ?? DateTime.now()) : null,
      metadata: metadata ? { ...deadline.metadata, ...metadata } : deadline.metadata,
    })
    await deadline.save()
    return (await this.find(deadline.tenant_id!, deadline.id))!
  }

  async softDelete(deadline: Deadline): Promise<void> {
    await deadline.softDelete()
  }
}
