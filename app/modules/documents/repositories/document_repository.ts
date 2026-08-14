import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

import ActivityRepository from '#modules/activities/repositories/activity_repository'
import LegalDocument from '#modules/documents/models/legal_document'
import type {
  CreateDocumentData,
  DocumentListInput,
  UpdateDocumentData,
} from '#modules/documents/interfaces/document_interface'

type ListOptions = Required<Pick<DocumentListInput, 'page' | 'per_page' | 'sort_by' | 'order'>> &
  Omit<DocumentListInput, 'page' | 'per_page' | 'sort_by' | 'order'>

@inject()
export default class DocumentRepository {
  constructor(private activityRepository: ActivityRepository) {}

  async paginate(
    tenantId: number,
    options: ListOptions
  ): Promise<ModelPaginatorContract<LegalDocument>> {
    const query = LegalDocument.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .preload('file')
      .preload('creator')

    if (options.search) {
      query.where((search) =>
        search
          .whereILike('title', `%${options.search}%`)
          .orWhereILike('description', `%${options.search}%`)
          .orWhereILike('document_type', `%${options.search}%`)
      )
    }
    if (options.folder_id) query.where('folder_id', options.folder_id)
    if (options.process_id) query.where('process_id', options.process_id)
    if (options.file_id) query.where('file_id', options.file_id)
    if (options.document_type) query.where('document_type', options.document_type)
    if (options.is_signed !== undefined) query.where('is_signed', options.is_signed)

    return query.orderBy(options.sort_by, options.order).paginate(options.page, options.per_page)
  }

  async find(tenantId: number, documentId: number): Promise<LegalDocument | null> {
    return LegalDocument.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where('id', documentId)
      .preload('file')
      .preload('creator')
      .first()
  }

  findFolder(tenantId: number, folderId: number) {
    return db
      .from('folders')
      .where({ tenant_id: tenantId, id: folderId })
      .whereNull('deleted_at')
      .first()
  }

  findProcess(tenantId: number, processId: number) {
    return db
      .from('processes')
      .where({ tenant_id: tenantId, id: processId })
      .whereNull('deleted_at')
      .first()
  }

  findFile(tenantId: number, fileId: number) {
    return db.from('files').where({ tenant_id: tenantId, id: fileId }).first()
  }

  findActiveLink(tenantId: number, folderId: number, processId: number | null, fileId: number) {
    const query = LegalDocument.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where({ folder_id: folderId, file_id: fileId })
    processId === null ? query.whereNull('process_id') : query.where('process_id', processId)
    return query.preload('file').preload('creator').first()
  }

  async create(
    tenantId: number,
    creatorId: number,
    data: CreateDocumentData
  ): Promise<LegalDocument> {
    const documentId = await db.transaction(async (trx) => {
      const document = await LegalDocument.create(
        {
          tenant_id: tenantId,
          folder_id: data.folder_id,
          process_id: data.process_id ?? null,
          file_id: data.file_id,
          created_by: creatorId,
          document_type: data.document_type,
          title: data.title,
          description: data.description ?? null,
          version: data.version ?? 1,
          is_signed: data.is_signed ?? false,
          metadata: data.metadata ?? {},
        },
        { client: trx }
      )
      await this.activityRepository.record(
        {
          tenant_id: tenantId,
          folder_id: data.folder_id,
          process_id: data.process_id ?? null,
          actor_id: creatorId,
          event_type: 'document.linked',
          summary: data.title,
          data: {
            document_id: document.id,
            file_id: data.file_id,
            document_type: data.document_type,
          },
        },
        trx
      )
      return document.id
    })

    return (await this.find(tenantId, documentId))!
  }

  async update(
    document: LegalDocument,
    actorId: number,
    data: UpdateDocumentData
  ): Promise<LegalDocument> {
    await db.transaction(async (trx) => {
      document.useTransaction(trx)
      const { metadata, ...fields } = data
      document.merge({
        ...fields,
        metadata: metadata ? { ...document.metadata, ...metadata } : document.metadata,
      })
      await document.save()
      await this.activityRepository.record(
        {
          tenant_id: document.tenant_id!,
          folder_id: document.folder_id,
          process_id: document.process_id,
          actor_id: actorId,
          event_type: 'document.updated',
          summary: document.title,
          data: { document_id: document.id, changed_fields: Object.keys(data) },
        },
        trx
      )
    })

    return (await this.find(document.tenant_id!, document.id))!
  }

  async softDelete(document: LegalDocument, actorId: number): Promise<void> {
    await db.transaction(async (trx) => {
      document.useTransaction(trx)
      await document.softDelete()
      await this.activityRepository.record(
        {
          tenant_id: document.tenant_id!,
          folder_id: document.folder_id,
          process_id: document.process_id,
          actor_id: actorId,
          event_type: 'document.unlinked',
          summary: document.title,
          data: { document_id: document.id, file_id: document.file_id },
        },
        trx
      )
    })
  }
}
