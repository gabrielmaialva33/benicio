import vine from '@vinejs/vine'

import { FOLDER_SORT_FIELDS, FOLDER_STATUSES } from '#modules/folders/interfaces/folder_interface'

const nullableText = (maxLength: number) =>
  vine.string().trim().maxLength(maxLength).optional().nullable()

const codeSchema = vine
  .string()
  .trim()
  .minLength(1)
  .maxLength(80)
  .transform((value) => value.toUpperCase())

const folderFields = {
  code: codeSchema,
  title: vine.string().trim().minLength(2).maxLength(255),
  description: nullableText(10_000),
  status: vine.enum(FOLDER_STATUSES).optional(),
  area: vine.string().trim().minLength(2).maxLength(120),
  subarea: nullableText(120),
  client_id: vine.number().positive(),
  responsible_lawyer_id: vine.number().positive().optional().nullable(),
  metadata: vine.record(vine.any()).optional(),
}

export const listFoldersValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    per_page: vine.number().min(1).max(100).optional(),
    sort_by: vine.enum(FOLDER_SORT_FIELDS).optional(),
    order: vine.enum(['asc', 'desc'] as const).optional(),
    search: vine.string().trim().maxLength(255).optional(),
    status: vine.enum(FOLDER_STATUSES).optional(),
    area: vine.string().trim().maxLength(120).optional(),
    client_id: vine.number().positive().optional(),
    responsible_lawyer_id: vine.number().positive().optional(),
  })
)

export const createFolderValidator = vine.compile(vine.object(folderFields))

export const updateFolderValidator = vine.compile(
  vine.object({
    code: codeSchema.optional(),
    title: folderFields.title.optional(),
    description: folderFields.description,
    status: folderFields.status,
    area: folderFields.area.optional(),
    subarea: folderFields.subarea,
    client_id: folderFields.client_id.optional(),
    responsible_lawyer_id: folderFields.responsible_lawyer_id,
    metadata: folderFields.metadata,
  })
)
