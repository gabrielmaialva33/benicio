import { inject } from '@adonisjs/core'

import ConflictException from '#exceptions/conflict_exception'
import NotFoundException from '#exceptions/not_found_exception'
import ValidationException from '#exceptions/validation_exception'
import ClientRepository from '#modules/clients/repositories/client_repository'
import type {
  ClientListInput,
  ClientPersonType,
  CreateClientData,
  UpdateClientData,
} from '#modules/clients/interfaces/client_interface'
import type Client from '#modules/clients/models/client'

@inject()
export default class ClientService {
  constructor(private clientRepository: ClientRepository) {}

  async list(tenantId: number, input: ClientListInput) {
    return this.clientRepository.paginate(tenantId, {
      page: input.page ?? 1,
      perPage: input.per_page ?? 10,
      sortBy: input.sort_by ?? 'id',
      direction: input.order ?? 'asc',
      search: input.search,
      personType: input.person_type,
    })
  }

  async get(tenantId: number, clientId: number): Promise<Client> {
    return this.findOrFail(tenantId, clientId)
  }

  async create(tenantId: number, input: CreateClientData): Promise<Client> {
    this.validateDocument(input.person_type, input.document)
    await this.ensureDocumentAvailable(tenantId, input.document)

    try {
      return await this.clientRepository.create(tenantId, input)
    } catch (error) {
      this.rethrowUniqueViolation(error)
      throw error
    }
  }

  async update(tenantId: number, clientId: number, input: UpdateClientData): Promise<Client> {
    if (Object.keys(input).length === 0) {
      throw new ValidationException('At least one client field must be provided')
    }

    const client = await this.findOrFail(tenantId, clientId)
    const document = input.document ?? client.document
    const personType = input.person_type ?? client.person_type
    this.validateDocument(personType, document)

    if (document !== client.document) {
      await this.ensureDocumentAvailable(tenantId, document, client.id)
    }

    try {
      return await this.clientRepository.update(client, input)
    } catch (error) {
      this.rethrowUniqueViolation(error)
      throw error
    }
  }

  async delete(tenantId: number, clientId: number): Promise<void> {
    const client = await this.findOrFail(tenantId, clientId)
    if (await this.clientRepository.hasActiveFolders(tenantId, client)) {
      throw new ConflictException('Client has active folders')
    }

    await this.clientRepository.softDelete(client)
  }

  private async findOrFail(tenantId: number, clientId: number): Promise<Client> {
    const client = await this.clientRepository.find(tenantId, clientId)
    if (!client) {
      throw new NotFoundException('Client not found')
    }
    return client
  }

  private async ensureDocumentAvailable(
    tenantId: number,
    document: string,
    currentClientId?: number
  ): Promise<void> {
    const existing = await this.clientRepository.findByDocument(tenantId, document)
    if (existing && existing.id !== currentClientId) {
      throw new ConflictException('A client with this document already exists')
    }
  }

  private validateDocument(personType: ClientPersonType, document: string): void {
    const valid =
      personType === 'individual' ? /^\d{11}$/.test(document) : /^[A-Z0-9]{12}\d{2}$/.test(document)

    if (!valid) {
      throw new ValidationException(
        personType === 'individual'
          ? 'Individual documents must contain 11 digits'
          : 'Company documents must contain 14 characters and two numeric check digits'
      )
    }
  }

  private rethrowUniqueViolation(error: unknown): void {
    if (this.hasDatabaseCode(error, '23505')) {
      throw new ConflictException('A client with this document already exists')
    }
  }

  private hasDatabaseCode(error: unknown, code: string): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === code
  }
}
