import vine from '@vinejs/vine'

import { DOCUMENT_SORT_FIELDS } from '#modules/documents/interfaces/document_interface'

const nullableText = (maxLength: number) =>
  vine.string().trim().minLength(1).maxLength(maxLength).optional().nullable()

const documentFields = {
  folder_id: vine.number().positive(),
  process_id: vine.number().positive().optional().nullable(),
  file_id: vine.number().positive(),
  document_type: vine.string().trim().minLength(1).maxLength(80),
  title: vine.string().trim().minLength(1).maxLength(255),
  description: nullableText(20_000),
  version: vine.number().min(1).max(10_000).optional(),
  is_signed: vine.boolean().optional(),
  metadata: vine.record(vine.any()).optional(),
}

export const listDocumentsValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    per_page: vine.number().min(1).max(100).optional(),
    sort_by: vine.enum(DOCUMENT_SORT_FIELDS).optional(),
    order: vine.enum(['asc', 'desc'] as const).optional(),
    search: vine.string().trim().maxLength(255).optional(),
    folder_id: vine.number().positive().optional(),
    process_id: vine.number().positive().optional(),
    file_id: vine.number().positive().optional(),
    document_type: vine.string().trim().maxLength(80).optional(),
    is_signed: vine.boolean().optional(),
  })
)

export const createDocumentValidator = vine.compile(vine.object(documentFields))

export const updateDocumentValidator = vine.compile(
  vine.object({
    process_id: documentFields.process_id,
    document_type: documentFields.document_type.optional(),
    title: documentFields.title.optional(),
    description: documentFields.description,
    version: documentFields.version,
    is_signed: documentFields.is_signed,
    metadata: documentFields.metadata,
  })
)
