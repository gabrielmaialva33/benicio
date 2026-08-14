import { inject } from '@adonisjs/core'

import NotFoundException from '#exceptions/not_found_exception'
import ValidationException from '#exceptions/validation_exception'
import DocumentRepository from '#modules/documents/repositories/document_repository'
import type {
  CreateDocumentData,
  DocumentListInput,
  UpdateDocumentData,
} from '#modules/documents/interfaces/document_interface'
import type LegalDocument from '#modules/documents/models/legal_document'

@inject()
export default class DocumentService {
  constructor(private documentRepository: DocumentRepository) {}

  list(tenantId: number, input: DocumentListInput) {
    return this.documentRepository.paginate(tenantId, {
      ...input,
      page: input.page ?? 1,
      per_page: input.per_page ?? 20,
      sort_by: input.sort_by ?? 'created_at',
      order: input.order ?? 'desc',
    })
  }

  get(tenantId: number, documentId: number): Promise<LegalDocument> {
    return this.findOrFail(tenantId, documentId)
  }

  async create(
    tenantId: number,
    creatorId: number,
    input: CreateDocumentData
  ): Promise<LegalDocument> {
    const prepared = await this.validateReferences(tenantId, input)
    const existing = await this.documentRepository.findActiveLink(
      tenantId,
      prepared.folder_id,
      prepared.process_id ?? null,
      prepared.file_id
    )
    return existing ?? this.documentRepository.create(tenantId, creatorId, prepared)
  }

  async update(
    tenantId: number,
    documentId: number,
    actorId: number,
    input: UpdateDocumentData
  ): Promise<LegalDocument> {
    if (Object.keys(input).length === 0) {
      throw new ValidationException('At least one document field must be provided')
    }
    const document = await this.findOrFail(tenantId, documentId)
    if (input.process_id !== undefined) {
      await this.validateProcess(tenantId, document.folder_id, input.process_id)
    }
    return this.documentRepository.update(document, actorId, input)
  }

  async delete(tenantId: number, documentId: number, actorId: number): Promise<void> {
    await this.documentRepository.softDelete(await this.findOrFail(tenantId, documentId), actorId)
  }

  private async validateReferences(
    tenantId: number,
    input: CreateDocumentData
  ): Promise<CreateDocumentData> {
    if (!(await this.documentRepository.findFolder(tenantId, input.folder_id))) {
      throw new NotFoundException('Folder not found')
    }
    await this.validateProcess(tenantId, input.folder_id, input.process_id ?? null)
    if (!(await this.documentRepository.findFile(tenantId, input.file_id))) {
      throw new NotFoundException('File not found in tenant')
    }
    return { ...input, process_id: input.process_id ?? null }
  }

  private async validateProcess(
    tenantId: number,
    folderId: number,
    processId: number | null
  ): Promise<void> {
    if (processId === null) return
    const process = await this.documentRepository.findProcess(tenantId, processId)
    if (!process) throw new NotFoundException('Process not found')
    if (Number(process.folder_id) !== folderId) {
      throw new ValidationException('Document process must belong to its folder')
    }
  }

  private async findOrFail(tenantId: number, documentId: number): Promise<LegalDocument> {
    const document = await this.documentRepository.find(tenantId, documentId)
    if (!document) throw new NotFoundException('Document not found')
    return document
  }
}
