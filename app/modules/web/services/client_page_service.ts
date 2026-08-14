import { inject } from '@adonisjs/core'

import type {
  ClientAddress,
  ClientListInput,
} from '#modules/clients/interfaces/client_interface'
import type Client from '#modules/clients/models/client'
import ClientReadRepository from '#modules/clients/repositories/client_read_repository'
import ClientService from '#modules/clients/services/client_service'
import FolderReadRepository, {
  type ClientFolderCountRow,
} from '#modules/folders/repositories/folder_read_repository'
import type {
  WebClient,
  WebClientAddress,
  WebClientDetailData,
  WebClientIndexData,
} from '#modules/web/interfaces/client_page_interface'

@inject()
export default class ClientPageService {
  constructor(
    private clientService: ClientService,
    private clientReadRepository: ClientReadRepository,
    private folderReadRepository: FolderReadRepository
  ) {}

  async index(tenantId: number, input: ClientListInput): Promise<WebClientIndexData> {
    const filters = {
      search: input.search ?? '',
      person_type: input.person_type ?? null,
      sort_by: input.sort_by ?? ('created_at' as const),
      order: input.order ?? ('desc' as const),
      per_page: input.per_page ?? 10,
    }
    const paginator = await this.clientService.list(tenantId, {
      ...input,
      sort_by: filters.sort_by,
      order: filters.order,
      per_page: filters.per_page,
    })
    const clients = paginator.all()
    const [countRows, stats] = await Promise.all([
      this.folderReadRepository.countsByClient(
        tenantId,
        clients.map((client) => client.id)
      ),
      this.clientReadRepository.summary(tenantId),
    ])
    const counts = new Map(countRows.map((row) => [Number(row.client_id), row]))

    return {
      clients: {
        data: clients.map((client) => this.client(client, counts.get(client.id))),
        meta: {
          total: paginator.total,
          per_page: paginator.perPage,
          current_page: paginator.currentPage,
          last_page: paginator.lastPage,
        },
      },
      filters,
      stats,
    }
  }

  async detail(tenantId: number, clientId: number): Promise<WebClientDetailData> {
    const client = await this.clientService.get(tenantId, clientId)
    const [counts, folders] = await Promise.all([
      this.folderReadRepository.countsByClient(tenantId, [clientId]),
      this.folderReadRepository.listForClient(tenantId, clientId),
    ])
    const count = counts[0]

    return {
      client: this.client(client, count),
      folders: folders.map((folder) => ({
        id: Number(folder.id),
        code: String(folder.code),
        title: String(folder.title),
        status: folder.status,
        area: String(folder.area),
        subarea: folder.subarea ? String(folder.subarea) : null,
        created_at: this.dateToIso(folder.created_at),
      })),
    }
  }

  private client(client: Client, counts?: ClientFolderCountRow): WebClient {
    return {
      id: client.id,
      name: client.name,
      document: client.document,
      person_type: client.person_type,
      email: client.email,
      phone: client.phone,
      address: this.address(client.address),
      notes: client.notes,
      folders_total: counts?.folders_total ?? 0,
      active_folders: counts?.active_folders ?? 0,
      created_at: client.created_at.toISO()!,
      updated_at: client.updated_at.toISO()!,
    }
  }

  private address(address: ClientAddress | null): WebClientAddress | null {
    if (!address) return null
    return {
      street: address.street ?? null,
      number: address.number ?? null,
      complement: address.complement ?? null,
      neighborhood: address.neighborhood ?? null,
      city: address.city ?? null,
      state: address.state ?? null,
      postal_code: address.postal_code ?? null,
      country: address.country ?? null,
    }
  }

  private dateToIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
  }
}
