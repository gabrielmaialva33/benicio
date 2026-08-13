import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

import Client from '#modules/clients/models/client'
import type {
  ClientListOptions,
  CreateClientData,
  UpdateClientData,
} from '#modules/clients/interfaces/client_interface'

export default class ClientRepository {
  async paginate(
    tenantId: number,
    options: ClientListOptions
  ): Promise<ModelPaginatorContract<Client>> {
    const query = Client.query().withScopes((scopes) => scopes.withTenant(tenantId))

    if (options.search) {
      query.where((searchQuery) => {
        searchQuery
          .whereILike('name', `%${options.search}%`)
          .orWhereILike('document', `%${options.search}%`)
          .orWhereILike('email', `%${options.search}%`)
      })
    }

    if (options.personType) {
      query.where('person_type', options.personType)
    }

    return query.orderBy(options.sortBy, options.direction).paginate(options.page, options.perPage)
  }

  async find(tenantId: number, clientId: number): Promise<Client | null> {
    return Client.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where('id', clientId)
      .first()
  }

  async findByDocument(tenantId: number, document: string): Promise<Client | null> {
    return Client.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where('document', document)
      .first()
  }

  async create(tenantId: number, data: CreateClientData): Promise<Client> {
    return Client.create({
      ...data,
      tenant_id: tenantId,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      notes: data.notes ?? null,
      metadata: data.metadata ?? {},
    })
  }

  async update(client: Client, data: UpdateClientData): Promise<Client> {
    client.merge({
      ...data,
      metadata: data.metadata ? { ...client.metadata, ...data.metadata } : client.metadata,
    })
    await client.save()
    return client
  }

  async hasActiveFolders(tenantId: number, client: Client): Promise<boolean> {
    const folder = await client
      .related('folders')
      .query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .first()
    return folder !== null
  }

  async softDelete(client: Client): Promise<void> {
    await client.softDelete()
  }
}
