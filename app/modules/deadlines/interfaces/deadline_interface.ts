export const DEADLINE_KINDS = ['judicial', 'extrajudicial', 'administrative', 'internal'] as const
export const DEADLINE_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const
export const DEADLINE_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export const DEADLINE_SORT_FIELDS = [
  'id',
  'due_at',
  'created_at',
  'status',
  'priority',
  'title',
] as const

export type DeadlineKind = (typeof DEADLINE_KINDS)[number]
export type DeadlineStatus = (typeof DEADLINE_STATUSES)[number]
export type DeadlinePriority = (typeof DEADLINE_PRIORITIES)[number]

export interface DeadlineListInput {
  page?: number
  per_page?: number
  sort_by?: (typeof DEADLINE_SORT_FIELDS)[number]
  order?: 'asc' | 'desc'
  search?: string
  kind?: DeadlineKind
  status?: DeadlineStatus
  priority?: DeadlinePriority
  is_fatal?: boolean
  folder_id?: number
  process_id?: number
  assignee_id?: number
  due_from?: Date
  due_to?: Date
  overdue?: boolean
}

export interface CreateDeadlineData {
  folder_id?: number | null
  process_id?: number | null
  assignee_id?: number | null
  title: string
  description?: string | null
  kind: DeadlineKind
  status?: DeadlineStatus
  priority?: DeadlinePriority
  is_fatal?: boolean
  due_at: Date
  legal_basis?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

export type UpdateDeadlineData = Partial<CreateDeadlineData>
