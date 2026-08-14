export const MOVEMENT_SOURCES = ['manual', 'court', 'integration', 'import'] as const
export const MOVEMENT_SORT_FIELDS = ['id', 'occurred_at', 'created_at', 'kind', 'title'] as const

export type MovementSource = (typeof MOVEMENT_SOURCES)[number]

export interface MovementListInput {
  page?: number
  per_page?: number
  sort_by?: (typeof MOVEMENT_SORT_FIELDS)[number]
  order?: 'asc' | 'desc'
  search?: string
  kind?: string
  source?: MovementSource
  process_id?: number
  folder_id?: number
  from?: Date
  to?: Date
}

export interface CreateMovementData {
  occurred_at: Date
  kind: string
  title: string
  description?: string | null
  source?: MovementSource
  external_id?: string | null
  metadata?: Record<string, unknown>
}

export type UpdateMovementData = Partial<Omit<CreateMovementData, 'source' | 'external_id'>>
