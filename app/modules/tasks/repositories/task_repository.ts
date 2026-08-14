import { DateTime } from 'luxon'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'
import db from '@adonisjs/lucid/services/db'

import Task from '#modules/tasks/models/task'
import type {
  CreateTaskData,
  TaskListInput,
  UpdateTaskData,
} from '#modules/tasks/interfaces/task_interface'

export default class TaskRepository {
  async paginate(
    tenantId: number,
    options: Required<Pick<TaskListInput, 'page' | 'per_page' | 'sort_by' | 'order'>> &
      Omit<TaskListInput, 'page' | 'per_page' | 'sort_by' | 'order'>
  ): Promise<ModelPaginatorContract<Task>> {
    const query = Task.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .preload('assignee')
      .preload('creator')

    if (options.search) {
      query.where((searchQuery) => {
        searchQuery
          .whereILike('title', `%${options.search}%`)
          .orWhereILike('description', `%${options.search}%`)
      })
    }
    if (options.status) query.where('status', options.status)
    if (options.priority) query.where('priority', options.priority)
    if (options.folder_id) query.where('folder_id', options.folder_id)
    if (options.process_id) query.where('process_id', options.process_id)
    if (options.assignee_id) query.where('assignee_id', options.assignee_id)
    if (options.due_from) query.where('due_date', '>=', options.due_from)
    if (options.due_to) query.where('due_date', '<=', options.due_to)
    if (options.overdue) {
      query
        .whereNotIn('status', ['completed', 'cancelled'])
        .whereNotNull('due_date')
        .where('due_date', '<', new Date())
    }

    return query.orderBy(options.sort_by, options.order).paginate(options.page, options.per_page)
  }

  async find(tenantId: number, taskId: number): Promise<Task | null> {
    return Task.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where('id', taskId)
      .preload('assignee')
      .preload('creator')
      .first()
  }

  async findFolder(tenantId: number, folderId: number) {
    return db
      .from('folders')
      .where({ tenant_id: tenantId, id: folderId })
      .whereNull('deleted_at')
      .first()
  }

  async findProcess(tenantId: number, processId: number) {
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

  async create(tenantId: number, creatorId: number, data: CreateTaskData): Promise<Task> {
    const status = data.status ?? 'pending'
    const task = await Task.create({
      tenant_id: tenantId,
      creator_id: creatorId,
      folder_id: data.folder_id ?? null,
      process_id: data.process_id ?? null,
      assignee_id: data.assignee_id ?? null,
      title: data.title,
      description: data.description ?? null,
      status,
      priority: data.priority ?? 'medium',
      due_date: data.due_date ? DateTime.fromJSDate(data.due_date) : null,
      completed_at: status === 'completed' ? DateTime.now() : null,
      tags: data.tags ?? [],
      metadata: data.metadata ?? {},
    })
    return (await this.find(tenantId, task.id))!
  }

  async update(task: Task, data: UpdateTaskData): Promise<Task> {
    const status = data.status ?? task.status
    task.merge({
      ...data,
      due_date:
        data.due_date === undefined
          ? task.due_date
          : data.due_date
            ? DateTime.fromJSDate(data.due_date)
            : null,
      completed_at: status === 'completed' ? (task.completed_at ?? DateTime.now()) : null,
      metadata: data.metadata ? { ...task.metadata, ...data.metadata } : task.metadata,
    })
    await task.save()
    return (await this.find(task.tenant_id!, task.id))!
  }

  async softDelete(task: Task): Promise<void> {
    await task.softDelete()
  }
}
