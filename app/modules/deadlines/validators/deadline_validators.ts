import vine from '@vinejs/vine'

import {
  DEADLINE_KINDS,
  DEADLINE_PRIORITIES,
  DEADLINE_SORT_FIELDS,
  DEADLINE_STATUSES,
} from '#modules/deadlines/interfaces/deadline_interface'

const dateTime = () =>
  vine.date({ formats: ['YYYY-MM-DDTHH:mm:ss.SSS[Z]', 'YYYY-MM-DDTHH:mm:ssZ'] })
const nullableText = (maxLength: number) =>
  vine.string().trim().minLength(1).maxLength(maxLength).optional().nullable()
const nullableId = vine.number().positive().optional().nullable()

const deadlineFields = {
  folder_id: nullableId,
  process_id: nullableId,
  assignee_id: nullableId,
  title: vine.string().trim().minLength(1).maxLength(255),
  description: nullableText(10_000),
  kind: vine.enum(DEADLINE_KINDS),
  status: vine.enum(DEADLINE_STATUSES).optional(),
  priority: vine.enum(DEADLINE_PRIORITIES).optional(),
  is_fatal: vine.boolean().optional(),
  due_at: dateTime(),
  legal_basis: nullableText(20_000),
  notes: nullableText(20_000),
  metadata: vine.record(vine.any()).optional(),
}

export const listDeadlinesValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    per_page: vine.number().min(1).max(100).optional(),
    sort_by: vine.enum(DEADLINE_SORT_FIELDS).optional(),
    order: vine.enum(['asc', 'desc'] as const).optional(),
    search: vine.string().trim().maxLength(255).optional(),
    kind: vine.enum(DEADLINE_KINDS).optional(),
    status: vine.enum(DEADLINE_STATUSES).optional(),
    priority: vine.enum(DEADLINE_PRIORITIES).optional(),
    is_fatal: vine.boolean().optional(),
    folder_id: vine.number().positive().optional(),
    process_id: vine.number().positive().optional(),
    assignee_id: vine.number().positive().optional(),
    due_from: dateTime().optional(),
    due_to: dateTime().optional(),
    overdue: vine.boolean().optional(),
  })
)

export const createDeadlineValidator = vine.compile(vine.object(deadlineFields))

export const updateDeadlineValidator = vine.compile(
  vine.object({
    folder_id: deadlineFields.folder_id,
    process_id: deadlineFields.process_id,
    assignee_id: deadlineFields.assignee_id,
    title: deadlineFields.title.optional(),
    description: deadlineFields.description,
    kind: deadlineFields.kind.optional(),
    status: deadlineFields.status,
    priority: deadlineFields.priority,
    is_fatal: deadlineFields.is_fatal,
    due_at: deadlineFields.due_at.optional(),
    legal_basis: deadlineFields.legal_basis,
    notes: deadlineFields.notes,
    metadata: deadlineFields.metadata,
  })
)

export const completeDeadlineValidator = vine.compile(
  vine.object({ completed: vine.boolean().optional() })
)
