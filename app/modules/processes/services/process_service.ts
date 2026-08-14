import { inject } from '@adonisjs/core'

import ConflictException from '#exceptions/conflict_exception'
import NotFoundException from '#exceptions/not_found_exception'
import ValidationException from '#exceptions/validation_exception'
import FolderRepository from '#modules/folders/repositories/folder_repository'
import { isValidCnj } from '#modules/processes/domain/cnj'
import ProcessRepository from '#modules/processes/repositories/process_repository'
import type {
  CreateProcessData,
  PreparedProcessPartyData,
  ProcessListInput,
  ProcessPartyInput,
  ProcessPartyPersonType,
  UpdateProcessData,
} from '#modules/processes/interfaces/process_interface'
import type LegalProcess from '#modules/processes/models/process'
import UnitOfWork from '#shared/lucid/unit_of_work'

@inject()
export default class ProcessService {
  constructor(
    private processRepository: ProcessRepository,
    private folderRepository: FolderRepository,
    private unitOfWork: UnitOfWork
  ) {}

  async list(tenantId: number, input: ProcessListInput) {
    this.validateDateRange(input.distribution_date_from, input.distribution_date_to)
    return this.processRepository.paginate(tenantId, this.listOptions(input))
  }

  async listForFolder(tenantId: number, folderId: number, input: ProcessListInput) {
    await this.findFolderOrFail(tenantId, folderId)
    this.validateDateRange(input.distribution_date_from, input.distribution_date_to)
    return this.processRepository.paginate(tenantId, {
      ...this.listOptions(input),
      folderId,
    })
  }

  async get(tenantId: number, processId: number): Promise<LegalProcess> {
    return this.findOrFail(tenantId, processId)
  }

  async getForFolder(tenantId: number, folderId: number, processId: number): Promise<LegalProcess> {
    return this.findForFolderOrFail(tenantId, folderId, processId)
  }

  async create(
    tenantId: number,
    folderId: number,
    input: CreateProcessData
  ): Promise<LegalProcess> {
    await this.findFolderOrFail(tenantId, folderId)
    this.validateIdentifiers(input)
    await this.ensureCnjAvailable(tenantId, input.cnj_number)
    const parties = this.prepareParties(input.parties ?? [])

    try {
      const processId = await this.unitOfWork.run(async (trx) => {
        if (!(await this.processRepository.lockFolder(tenantId, folderId, trx))) {
          throw new NotFoundException('Folder not found')
        }
        if (input.is_primary) {
          await this.processRepository.clearPrimary(tenantId, folderId, trx)
        }

        const process = await this.processRepository.create(tenantId, folderId, input, parties, trx)
        return process.id
      })

      return this.findOrFail(tenantId, processId)
    } catch (error) {
      this.rethrowConstraintViolation(error)
      throw error
    }
  }

  async update(
    tenantId: number,
    processId: number,
    input: UpdateProcessData
  ): Promise<LegalProcess> {
    if (Object.keys(input).length === 0) {
      throw new ValidationException('At least one process field must be provided')
    }

    const current = await this.findOrFail(tenantId, processId)
    this.validateIdentifiers(input, current)
    if (input.cnj_number !== undefined && input.cnj_number !== current.cnj_number) {
      await this.ensureCnjAvailable(tenantId, input.cnj_number, current.id)
    }
    const parties = input.parties === undefined ? undefined : this.prepareParties(input.parties)

    try {
      await this.unitOfWork.run(async (trx) => {
        if (!(await this.processRepository.lockFolder(tenantId, current.folder_id, trx))) {
          throw new NotFoundException('Folder not found')
        }
        const process = await this.processRepository.find(tenantId, processId, trx)
        if (!process) {
          throw new NotFoundException('Process not found')
        }
        if (input.is_primary) {
          await this.processRepository.clearPrimary(tenantId, process.folder_id, trx, process.id)
        }
        await this.processRepository.update(process, input, parties, trx)
      })

      return this.findOrFail(tenantId, processId)
    } catch (error) {
      this.rethrowConstraintViolation(error)
      throw error
    }
  }

  async updateForFolder(
    tenantId: number,
    folderId: number,
    processId: number,
    input: UpdateProcessData
  ): Promise<LegalProcess> {
    await this.findForFolderOrFail(tenantId, folderId, processId)
    return this.update(tenantId, processId, input)
  }

  async markPrimary(tenantId: number, processId: number): Promise<LegalProcess> {
    const current = await this.findOrFail(tenantId, processId)

    try {
      await this.unitOfWork.run(async (trx) => {
        if (!(await this.processRepository.lockFolder(tenantId, current.folder_id, trx))) {
          throw new NotFoundException('Folder not found')
        }
        const process = await this.processRepository.find(tenantId, processId, trx)
        if (!process) {
          throw new NotFoundException('Process not found')
        }

        await this.processRepository.clearPrimary(tenantId, process.folder_id, trx, process.id)
        await this.processRepository.update(process, { is_primary: true }, undefined, trx)
      })

      return this.findOrFail(tenantId, processId)
    } catch (error) {
      this.rethrowConstraintViolation(error)
      throw error
    }
  }

  async markPrimaryForFolder(
    tenantId: number,
    folderId: number,
    processId: number
  ): Promise<LegalProcess> {
    await this.findForFolderOrFail(tenantId, folderId, processId)
    return this.markPrimary(tenantId, processId)
  }

  async delete(tenantId: number, processId: number): Promise<void> {
    await this.unitOfWork.run(async (trx) => {
      const process = await this.processRepository.find(tenantId, processId, trx)
      if (!process) {
        throw new NotFoundException('Process not found')
      }
      await this.processRepository.softDelete(process, trx)
    })
  }

  async deleteForFolder(tenantId: number, folderId: number, processId: number): Promise<void> {
    await this.findForFolderOrFail(tenantId, folderId, processId)
    await this.delete(tenantId, processId)
  }

  private listOptions(input: ProcessListInput) {
    return {
      page: input.page ?? 1,
      perPage: input.per_page ?? 10,
      sortBy: input.sort_by ?? 'id',
      direction: input.order ?? 'asc',
      search: input.search,
      cnjNumber: input.cnj_number,
      folderId: input.folder_id,
      clientId: input.client_id,
      status: input.status,
      instance: input.instance,
      phase: input.phase,
      electronic: input.electronic,
      isPrimary: input.is_primary,
      tribunal: input.tribunal,
      district: input.district,
      judge: input.judge,
      partyDocument: input.party_document,
      distributionDateFrom: input.distribution_date_from,
      distributionDateTo: input.distribution_date_to,
    }
  }

  private async findOrFail(tenantId: number, processId: number): Promise<LegalProcess> {
    const process = await this.processRepository.find(tenantId, processId)
    if (!process) {
      throw new NotFoundException('Process not found')
    }
    return process
  }

  private async findForFolderOrFail(
    tenantId: number,
    folderId: number,
    processId: number
  ): Promise<LegalProcess> {
    const process = await this.processRepository.findForFolder(tenantId, folderId, processId)
    if (!process) {
      throw new NotFoundException('Process not found in folder')
    }
    return process
  }

  private async findFolderOrFail(tenantId: number, folderId: number): Promise<void> {
    if (!(await this.folderRepository.find(tenantId, folderId))) {
      throw new NotFoundException('Folder not found')
    }
  }

  private validateIdentifiers(input: UpdateProcessData, current?: LegalProcess): void {
    const cnjNumber = input.cnj_number === undefined ? current?.cnj_number : input.cnj_number
    const legacyNumber =
      input.legacy_number === undefined ? current?.legacy_number : input.legacy_number
    const internalCode =
      input.internal_code === undefined ? current?.internal_code : input.internal_code

    if (!cnjNumber && !legacyNumber && !internalCode) {
      throw new ValidationException(
        'A process requires a CNJ number, legacy number, or internal code'
      )
    }
    if (cnjNumber && !isValidCnj(cnjNumber)) {
      throw new ValidationException('CNJ number is invalid')
    }
  }

  private async ensureCnjAvailable(
    tenantId: number,
    cnjNumber?: string | null,
    currentProcessId?: number
  ): Promise<void> {
    if (!cnjNumber) {
      return
    }

    const existing = await this.processRepository.findByCnj(tenantId, cnjNumber)
    if (existing && existing.id !== currentProcessId) {
      throw new ConflictException('A process with this CNJ number already exists')
    }
  }

  private prepareParties(parties: ProcessPartyInput[]): PreparedProcessPartyData[] {
    const primarySides = new Set<string>()

    return parties.map((party) => {
      if (party.is_primary && primarySides.has(party.side)) {
        throw new ValidationException(`Only one primary party is allowed for side ${party.side}`)
      }
      if (party.is_primary) {
        primarySides.add(party.side)
      }

      const personType = this.validatePartyDocument(party.document, party.person_type)
      return {
        ...party,
        role: party.role ?? null,
        is_primary: party.is_primary ?? false,
        document: party.document ?? null,
        person_type: personType,
        metadata: party.metadata ?? {},
      }
    })
  }

  private validatePartyDocument(
    document?: string | null,
    requestedType?: ProcessPartyPersonType | null
  ): ProcessPartyPersonType | null {
    if (!document) {
      return requestedType ?? null
    }

    const personType =
      requestedType ??
      (/^[0-9]{11}$/.test(document)
        ? 'individual'
        : /^[A-Z0-9]{12}[0-9]{2}$/.test(document)
          ? 'company'
          : null)
    const valid =
      personType === 'individual'
        ? /^[0-9]{11}$/.test(document)
        : personType === 'company' && /^[A-Z0-9]{12}[0-9]{2}$/.test(document)

    if (!valid) {
      throw new ValidationException('Party document does not match its person type')
    }
    return personType
  }

  private validateDateRange(from?: string, to?: string): void {
    if (from && to && from > to) {
      throw new ValidationException(
        'distribution_date_from must be before or equal to distribution_date_to'
      )
    }
  }

  private rethrowConstraintViolation(error: unknown): void {
    if (this.hasDatabaseCode(error, '23505')) {
      throw new ConflictException(
        'A process with this CNJ number or primary folder position exists'
      )
    }
    if (this.hasDatabaseCode(error, '23503')) {
      throw new NotFoundException('A referenced folder was not found')
    }
    if (this.hasDatabaseCode(error, '23514')) {
      throw new ValidationException('Process data violates a domain constraint')
    }
  }

  private hasDatabaseCode(error: unknown, code: string): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === code
  }
}
