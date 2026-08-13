import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'

import ConflictException from '#exceptions/conflict_exception'
import NotFoundException from '#exceptions/not_found_exception'
import ValidationException from '#exceptions/validation_exception'
import ClientRepository from '#modules/clients/repositories/client_repository'
import FolderRepository from '#modules/folders/repositories/folder_repository'
import type {
  CreateFolderData,
  FolderListInput,
  UpdateFolderData,
} from '#modules/folders/interfaces/folder_interface'
import type Folder from '#modules/folders/models/folder'

@inject()
export default class FolderService {
  constructor(
    private folderRepository: FolderRepository,
    private clientRepository: ClientRepository
  ) {}

  async list(tenantId: number, input: FolderListInput) {
    return this.folderRepository.paginate(tenantId, {
      page: input.page ?? 1,
      perPage: input.per_page ?? 10,
      sortBy: input.sort_by ?? 'id',
      direction: input.order ?? 'asc',
      search: input.search,
      status: input.status,
      area: input.area,
      clientId: input.client_id,
      responsibleLawyerId: input.responsible_lawyer_id,
    })
  }

  async get(tenantId: number, folderId: number): Promise<Folder> {
    return this.findOrFail(tenantId, folderId)
  }

  async create(tenantId: number, input: CreateFolderData): Promise<Folder> {
    await this.validateReferences(tenantId, input.client_id, input.responsible_lawyer_id)
    await this.ensureCodeAvailable(tenantId, input.code)

    try {
      return await this.folderRepository.create(tenantId, input)
    } catch (error) {
      this.rethrowConstraintViolation(error)
      throw error
    }
  }

  async update(tenantId: number, folderId: number, input: UpdateFolderData): Promise<Folder> {
    if (Object.keys(input).length === 0) {
      throw new ValidationException('At least one folder field must be provided')
    }

    const folder = await this.findOrFail(tenantId, folderId)
    const clientId = input.client_id ?? folder.client_id
    const responsibleLawyerId =
      input.responsible_lawyer_id === undefined
        ? folder.responsible_lawyer_id
        : input.responsible_lawyer_id

    await this.validateReferences(tenantId, clientId, responsibleLawyerId)
    if (input.code && input.code !== folder.code) {
      await this.ensureCodeAvailable(tenantId, input.code, folder.id)
    }

    try {
      return await this.folderRepository.update(folder, input)
    } catch (error) {
      this.rethrowConstraintViolation(error)
      throw error
    }
  }

  async delete(tenantId: number, folderId: number): Promise<void> {
    await db.transaction(async (trx) => {
      const folder = await this.folderRepository.findForUpdate(tenantId, folderId, trx)
      if (!folder) {
        throw new NotFoundException('Folder not found')
      }
      if (await this.folderRepository.hasActiveProcesses(tenantId, folder.id, trx)) {
        throw new ConflictException('Folder has active processes')
      }
      await this.folderRepository.softDelete(folder, trx)
    })
  }

  private async findOrFail(tenantId: number, folderId: number): Promise<Folder> {
    const folder = await this.folderRepository.find(tenantId, folderId)
    if (!folder) {
      throw new NotFoundException('Folder not found')
    }
    return folder
  }

  private async validateReferences(
    tenantId: number,
    clientId: number,
    responsibleLawyerId?: number | null
  ): Promise<void> {
    if (!(await this.clientRepository.find(tenantId, clientId))) {
      throw new NotFoundException('Client not found')
    }

    if (
      responsibleLawyerId !== undefined &&
      responsibleLawyerId !== null &&
      !(await this.folderRepository.isUserInTenant(tenantId, responsibleLawyerId))
    ) {
      throw new NotFoundException('Responsible lawyer not found in tenant')
    }
  }

  private async ensureCodeAvailable(
    tenantId: number,
    code: string,
    currentFolderId?: number
  ): Promise<void> {
    const existing = await this.folderRepository.findByCode(tenantId, code)
    if (existing && existing.id !== currentFolderId) {
      throw new ConflictException('A folder with this code already exists')
    }
  }

  private rethrowConstraintViolation(error: unknown): void {
    if (this.hasDatabaseCode(error, '23505')) {
      throw new ConflictException('A folder with this code already exists')
    }
    if (this.hasDatabaseCode(error, '23503')) {
      throw new NotFoundException('A referenced client or responsible lawyer was not found')
    }
  }

  private hasDatabaseCode(error: unknown, code: string): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === code
  }
}
