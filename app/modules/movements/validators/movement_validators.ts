import vine from '@vinejs/vine'

import {
  MOVEMENT_SORT_FIELDS,
  MOVEMENT_SOURCES,
} from '#modules/movements/interfaces/movement_interface'

const dateTime = () =>
  vine.date({ formats: ['YYYY-MM-DDTHH:mm:ss.SSS[Z]', 'YYYY-MM-DDTHH:mm:ssZ'] })
const nullableText = (maxLength: number) =>
  vine.string().trim().minLength(1).maxLength(maxLength).optional().nullable()

const movementFields = {
  occurred_at: dateTime(),
  kind: vine.string().trim().minLength(1).maxLength(80),
  title: vine.string().trim().minLength(1).maxLength(255),
  description: nullableText(20_000),
  source: vine.enum(MOVEMENT_SOURCES).optional(),
  external_id: vine.string().trim().minLength(1).maxLength(255).optional().nullable(),
  metadata: vine.record(vine.any()).optional(),
}

export const listMovementsValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    per_page: vine.number().min(1).max(100).optional(),
    sort_by: vine.enum(MOVEMENT_SORT_FIELDS).optional(),
    order: vine.enum(['asc', 'desc'] as const).optional(),
    search: vine.string().trim().maxLength(255).optional(),
    kind: vine.string().trim().maxLength(80).optional(),
    source: vine.enum(MOVEMENT_SOURCES).optional(),
    process_id: vine.number().positive().optional(),
    folder_id: vine.number().positive().optional(),
    from: dateTime().optional(),
    to: dateTime().optional(),
  })
)

export const createMovementValidator = vine.compile(vine.object(movementFields))

export const updateMovementValidator = vine.compile(
  vine.object({
    occurred_at: movementFields.occurred_at.optional(),
    kind: movementFields.kind.optional(),
    title: movementFields.title.optional(),
    description: movementFields.description,
    metadata: movementFields.metadata,
  })
)
