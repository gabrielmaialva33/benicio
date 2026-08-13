import db from '@adonisjs/lucid/services/db'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

import Folder from '#modules/folders/models/folder'
import type {
  CreateFolderData,
  FolderListOptions,
  UpdateFolderData,
} from '#modules/folders/interfaces/folder_interface'

export default class FolderRepository {
  async paginate(
    tenantId: number,
    options: FolderListOptions
  ): Promise<ModelPaginatorContract<Folder>> {
    const query = Folder.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .preload('client')
      .preload('responsible_lawyer')

    if (options.search) {
      query.where((searchQuery) => {
        searchQuery
          .whereILike('code', `%${options.search}%`)
          .orWhereILike('title', `%${options.search}%`)
          .orWhereILike('description', `%${options.search}%`)
          .orWhereHas('client', (clientQuery) => {
            clientQuery.whereILike('name', `%${options.search}%`)
          })
      })
    }

    if (options.status) {
      query.where('status', options.status)
    }
    if (options.area) {
      query.whereILike('area', options.area)
    }
    if (options.clientId) {
      query.where('client_id', options.clientId)
    }
    if (options.responsibleLawyerId) {
      query.where('responsible_lawyer_id', options.responsibleLawyerId)
    }

    return query.orderBy(options.sortBy, options.direction).paginate(options.page, options.perPage)
  }

  async find(tenantId: number, folderId: number): Promise<Folder | null> {
    return Folder.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where('id', folderId)
      .preload('client')
      .preload('responsible_lawyer')
      .first()
  }

  async findByCode(tenantId: number, code: string): Promise<Folder | null> {
    return Folder.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where('code', code)
      .first()
  }

  async isUserInTenant(tenantId: number, userId: number): Promise<boolean> {
    const membership = await db
      .from('user_tenants')
      .innerJoin('users', 'users.id', 'user_tenants.user_id')
      .where('user_tenants.tenant_id', tenantId)
      .where('user_tenants.user_id', userId)
      .where('users.is_deleted', false)
      .first()
    return membership !== null && membership !== undefined
  }

  async create(tenantId: number, data: CreateFolderData): Promise<Folder> {
    const folder = await Folder.create({
      ...data,
      tenant_id: tenantId,
      description: data.description ?? null,
      status: data.status ?? 'active',
      subarea: data.subarea ?? null,
      responsible_lawyer_id: data.responsible_lawyer_id ?? null,
      metadata: data.metadata ?? {},
    })
    return this.loadRelations(folder)
  }

  async update(folder: Folder, data: UpdateFolderData): Promise<Folder> {
    folder.merge({
      ...data,
      metadata: data.metadata ? { ...folder.metadata, ...data.metadata } : folder.metadata,
    })
    await folder.save()
    return this.loadRelations(folder)
  }

  async softDelete(folder: Folder): Promise<void> {
    await folder.softDelete()
  }

  private async loadRelations(folder: Folder): Promise<Folder> {
    await folder.load('client')
    await folder.load('responsible_lawyer')
    return folder
  }
}
