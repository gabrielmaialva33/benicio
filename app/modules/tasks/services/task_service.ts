import { inject } from '@adonisjs/core'

import ConflictException from '#exceptions/conflict_exception'
import NotFoundException from '#exceptions/not_found_exception'
import ValidationException from '#exceptions/validation_exception'
import TaskRepository from '#modules/tasks/repositories/task_repository'
import type {
  CreateTaskData,
  TaskListInput,
  TaskStatus,
  UpdateTaskData,
} from '#modules/tasks/interfaces/task_interface'
import type Task from '#modules/tasks/models/task'

@inject()
export default class TaskService {
  constructor(private taskRepository: TaskRepository) {}

  async list(tenantId: number, input: TaskListInput) {
    return this.taskRepository.paginate(tenantId, {
      ...input,
      page: input.page ?? 1,
      per_page: input.per_page ?? 10,
      sort_by: input.sort_by ?? 'due_date',
      order: input.order ?? 'asc',
    })
  }

  async get(tenantId: number, taskId: number): Promise<Task> {
    return this.findOrFail(tenantId, taskId)
  }

  async create(tenantId: number, creatorId: number, input: CreateTaskData): Promise<Task> {
    const prepared = await this.prepareReferences(tenantId, input)
    try {
      return await this.taskRepository.create(tenantId, creatorId, this.normalize(prepared))
    } catch (error) {
      this.rethrowConstraintViolation(error)
      throw error
    }
  }

  async update(tenantId: number, taskId: number, input: UpdateTaskData): Promise<Task> {
    if (Object.keys(input).length === 0) {
      throw new ValidationException('At least one task field must be provided')
    }

    const task = await this.findOrFail(tenantId, taskId)
    const prepared = await this.prepareReferences(tenantId, input, task)
    try {
      return await this.taskRepository.update(task, this.normalize(prepared))
    } catch (error) {
      this.rethrowConstraintViolation(error)
      throw error
    }
  }

  async updateStatus(tenantId: number, taskId: number, status: TaskStatus): Promise<Task> {
    return this.update(tenantId, taskId, { status })
  }

  async delete(tenantId: number, taskId: number): Promise<void> {
    await this.taskRepository.softDelete(await this.findOrFail(tenantId, taskId))
  }

  private async findOrFail(tenantId: number, taskId: number): Promise<Task> {
    const task = await this.taskRepository.find(tenantId, taskId)
    if (!task) throw new NotFoundException('Task not found')
    return task
  }

  private async prepareReferences<T extends CreateTaskData | UpdateTaskData>(
    tenantId: number,
    input: T,
    current?: Task
  ): Promise<T> {
    let folderId = input.folder_id === undefined ? current?.folder_id : input.folder_id
    const processId = input.process_id === undefined ? current?.process_id : input.process_id
    const assigneeId = input.assignee_id === undefined ? current?.assignee_id : input.assignee_id

    if (processId !== null && processId !== undefined) {
      const process = await this.taskRepository.findProcess(tenantId, processId)
      if (!process) throw new NotFoundException('Process not found')
      if (folderId === null || folderId === undefined) folderId = process.folder_id as number
      if (Number(process.folder_id) !== folderId) {
        throw new ValidationException('Task folder must match the selected process folder')
      }
    }

    if (folderId !== null && folderId !== undefined) {
      if (!(await this.taskRepository.findFolder(tenantId, folderId))) {
        throw new NotFoundException('Folder not found')
      }
    }

    if (
      assigneeId !== null &&
      assigneeId !== undefined &&
      !(await this.taskRepository.isUserInTenant(tenantId, assigneeId))
    ) {
      throw new NotFoundException('Assignee not found in tenant')
    }

    return { ...input, folder_id: folderId ?? null, process_id: processId ?? null } as T
  }

  private normalize<T extends CreateTaskData | UpdateTaskData>(input: T): T {
    return {
      ...input,
      ...(input.tags ? { tags: [...new Set(input.tags)] } : {}),
    }
  }

  private rethrowConstraintViolation(error: unknown): void {
    if (this.hasDatabaseCode(error, '23503')) {
      throw new NotFoundException('A referenced folder, process, or assignee was not found')
    }
    if (this.hasDatabaseCode(error, '23514')) {
      throw new ConflictException('Task data violates a domain constraint')
    }
  }

  private hasDatabaseCode(error: unknown, code: string): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === code
  }
}
