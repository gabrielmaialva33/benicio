import vine from '@vinejs/vine'

import {
  TASK_PRIORITIES,
  TASK_SORT_FIELDS,
  TASK_STATUSES,
} from '#modules/tasks/interfaces/task_interface'

const nullableId = vine.number().positive().optional().nullable()
const dateTime = () =>
  vine.date({
    formats: ['YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss.SSS[Z]', 'YYYY-MM-DDTHH:mm:ssZ'],
  })
const nullableDate = dateTime().optional().nullable()

const taskFields = {
  title: vine.string().trim().minLength(1).maxLength(255),
  description: vine.string().trim().minLength(1).maxLength(10_000).optional().nullable(),
  status: vine.enum(TASK_STATUSES).optional(),
  priority: vine.enum(TASK_PRIORITIES).optional(),
  due_date: nullableDate,
  folder_id: nullableId,
  process_id: nullableId,
  assignee_id: nullableId,
  tags: vine.array(vine.string().trim().minLength(1).maxLength(80)).maxLength(50).optional(),
  metadata: vine.record(vine.any()).optional(),
}

export const listTasksValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    per_page: vine.number().min(1).max(100).optional(),
    sort_by: vine.enum(TASK_SORT_FIELDS).optional(),
    order: vine.enum(['asc', 'desc'] as const).optional(),
    search: vine.string().trim().maxLength(255).optional(),
    status: vine.enum(TASK_STATUSES).optional(),
    priority: vine.enum(TASK_PRIORITIES).optional(),
    folder_id: vine.number().positive().optional(),
    process_id: vine.number().positive().optional(),
    assignee_id: vine.number().positive().optional(),
    due_from: dateTime().optional(),
    due_to: dateTime().optional(),
    overdue: vine.boolean().optional(),
  })
)

export const createTaskValidator = vine.compile(vine.object(taskFields))

export const updateTaskValidator = vine.compile(
  vine.object({
    title: taskFields.title.optional(),
    description: taskFields.description,
    status: taskFields.status,
    priority: taskFields.priority,
    due_date: taskFields.due_date,
    folder_id: taskFields.folder_id,
    process_id: taskFields.process_id,
    assignee_id: taskFields.assignee_id,
    tags: taskFields.tags,
    metadata: taskFields.metadata,
  })
)

export const updateTaskStatusValidator = vine.compile(
  vine.object({ status: vine.enum(TASK_STATUSES) })
)
