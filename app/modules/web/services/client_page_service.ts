import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'

import type {
  ClientAddress,
  ClientListInput,
} from '#modules/clients/interfaces/client_interface'
import type Client from '#modules/clients/models/client'
import ClientService from '#modules/clients/services/client_service'
import type {
  WebClient,
  WebClientAddress,
  WebClientDetailData,
  WebClientIndexData,
} from '#modules/web/interfaces/client_page_interface'

type ClientFolderCount = {
  client_id: number
  folders_total: number
  active_folders: number
}

type ClientAggregate = {
  total: number
  individuals: number
  companies: number
  with_active_folders: number
}

type RawRows<Row> = { rows: Row[] }

@inject()
export default class ClientPageService {
  constructor(private clientService: ClientService) {}

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
    const counts = await this.folderCounts(
      tenantId,
      clients.map((client) => client.id)
    )
    const aggregate = await db.rawQuery<RawRows<ClientAggregate>>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE person_type = 'individual')::int AS individuals,
         COUNT(*) FILTER (WHERE person_type = 'company')::int AS companies,
         COUNT(*) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM folders
             WHERE folders.tenant_id = clients.tenant_id
               AND folders.client_id = clients.id
               AND folders.deleted_at IS NULL
               AND folders.status = 'active'
           )
         )::int AS with_active_folders
       FROM clients
       WHERE tenant_id = ? AND deleted_at IS NULL`,
      [tenantId]
    )

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
      stats: aggregate.rows[0] ?? {
        total: 0,
        individuals: 0,
        companies: 0,
        with_active_folders: 0,
      },
    }
  }

  async detail(tenantId: number, clientId: number): Promise<WebClientDetailData> {
    const client = await this.clientService.get(tenantId, clientId)
    const [counts, folders] = await Promise.all([
      this.folderCounts(tenantId, [clientId]),
      db
        .from('folders')
        .select('id', 'code', 'title', 'status', 'area', 'subarea', 'created_at')
        .where('tenant_id', tenantId)
        .where('client_id', clientId)
        .whereNull('deleted_at')
        .orderBy('updated_at', 'desc')
        .limit(50),
    ])

    return {
      client: this.client(client, counts.get(clientId)),
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

  private async folderCounts(tenantId: number, clientIds: number[]) {
    const result = new Map<number, ClientFolderCount>()
    if (clientIds.length === 0) return result

    const rows = await db
      .from('folders')
      .select('client_id')
      .count('* as folders_total')
      .count('* as active_folders')
      .where('tenant_id', tenantId)
      .whereIn('client_id', clientIds)
      .whereNull('deleted_at')
      .groupBy('client_id')

    // Knex cannot express a filtered aggregate through `.count` portably, so
    // replace the provisional active count with the exact status count.
    const activeRows = await db
      .from('folders')
      .select('client_id')
      .count('* as active_folders')
      .where('tenant_id', tenantId)
      .whereIn('client_id', clientIds)
      .where('status', 'active')
      .whereNull('deleted_at')
      .groupBy('client_id')
    const activeByClient = new Map(
      activeRows.map((row) => [Number(row.client_id), Number(row.active_folders)])
    )

    for (const row of rows) {
      const clientId = Number(row.client_id)
      result.set(clientId, {
        client_id: clientId,
        folders_total: Number(row.folders_total),
        active_folders: activeByClient.get(clientId) ?? 0,
      })
    }
    return result
  }

  private client(client: Client, counts?: ClientFolderCount): WebClient {
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
