import { inject } from '@adonisjs/core'

import NotFoundException from '#exceptions/not_found_exception'
import ValidationException from '#exceptions/validation_exception'
import DeadlineRepository from '#modules/deadlines/repositories/deadline_repository'
import type {
  CreateDeadlineData,
  DeadlineListInput,
  UpdateDeadlineData,
} from '#modules/deadlines/interfaces/deadline_interface'
import type Deadline from '#modules/deadlines/models/deadline'

@inject()
export default class DeadlineService {
  constructor(private deadlineRepository: DeadlineRepository) {}

  list(tenantId: number, input: DeadlineListInput) {
    return this.deadlineRepository.paginate(tenantId, {
      ...input,
      page: input.page ?? 1,
      per_page: input.per_page ?? 10,
      sort_by: input.sort_by ?? 'due_at',
      order: input.order ?? 'asc',
    })
  }

  async get(tenantId: number, deadlineId: number): Promise<Deadline> {
    return this.findOrFail(tenantId, deadlineId)
  }

  async create(tenantId: number, creatorId: number, input: CreateDeadlineData): Promise<Deadline> {
    const prepared = await this.prepareReferences(tenantId, input)
    return this.deadlineRepository.create(tenantId, creatorId, prepared)
  }

  async update(tenantId: number, deadlineId: number, input: UpdateDeadlineData): Promise<Deadline> {
    if (Object.keys(input).length === 0) {
      throw new ValidationException('At least one deadline field must be provided')
    }
    const deadline = await this.findOrFail(tenantId, deadlineId)
    const prepared = await this.prepareReferences(tenantId, input, deadline)
    return this.deadlineRepository.update(deadline, prepared)
  }

  complete(tenantId: number, deadlineId: number, completed: boolean): Promise<Deadline> {
    return this.update(tenantId, deadlineId, { status: completed ? 'completed' : 'pending' })
  }

  async delete(tenantId: number, deadlineId: number): Promise<void> {
    await this.deadlineRepository.softDelete(await this.findOrFail(tenantId, deadlineId))
  }

  private async findOrFail(tenantId: number, deadlineId: number): Promise<Deadline> {
    const deadline = await this.deadlineRepository.find(tenantId, deadlineId)
    if (!deadline) throw new NotFoundException('Deadline not found')
    return deadline
  }

  private async prepareReferences<T extends CreateDeadlineData | UpdateDeadlineData>(
    tenantId: number,
    input: T,
    current?: Deadline
  ): Promise<T> {
    let folderId = input.folder_id === undefined ? current?.folder_id : input.folder_id
    const processId = input.process_id === undefined ? current?.process_id : input.process_id
    const assigneeId = input.assignee_id === undefined ? current?.assignee_id : input.assignee_id

    if (processId !== null && processId !== undefined) {
      const process = await this.deadlineRepository.findProcess(tenantId, processId)
      if (!process) throw new NotFoundException('Process not found')
      if (folderId === null || folderId === undefined) folderId = Number(process.folder_id)
      if (Number(process.folder_id) !== folderId) {
        throw new ValidationException('Deadline folder must match the selected process folder')
      }
    }

    if (!folderId || !(await this.deadlineRepository.findFolder(tenantId, folderId))) {
      throw new NotFoundException('Folder not found')
    }
    if (
      assigneeId !== null &&
      assigneeId !== undefined &&
      !(await this.deadlineRepository.isUserInTenant(tenantId, assigneeId))
    ) {
      throw new NotFoundException('Assignee not found in tenant')
    }

    return { ...input, folder_id: folderId, process_id: processId ?? null } as T
  }
}
