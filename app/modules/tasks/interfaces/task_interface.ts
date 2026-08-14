export const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export const TASK_SORT_FIELDS = [
  'id',
  'title',
  'status',
  'priority',
  'due_date',
  'created_at',
] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]
export type TaskPriority = (typeof TASK_PRIORITIES)[number]
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number]

export interface TaskListInput {
  page?: number
  per_page?: number
  sort_by?: TaskSortField
  order?: 'asc' | 'desc'
  search?: string
  status?: TaskStatus
  priority?: TaskPriority
  folder_id?: number
  process_id?: number
  assignee_id?: number
  due_from?: Date
  due_to?: Date
  overdue?: boolean
}

export interface CreateTaskData {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: Date | null
  folder_id?: number | null
  process_id?: number | null
  assignee_id?: number | null
  tags?: string[]
  metadata?: Record<string, unknown>
}

export type UpdateTaskData = Partial<CreateTaskData>
