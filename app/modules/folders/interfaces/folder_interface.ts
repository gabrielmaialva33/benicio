export const FOLDER_STATUSES = ['active', 'completed', 'pending', 'cancelled', 'archived'] as const
export type FolderStatus = (typeof FOLDER_STATUSES)[number]

export const FOLDER_SORT_FIELDS = [
  'id',
  'code',
  'title',
  'status',
  'area',
  'created_at',
  'updated_at',
] as const
export type FolderSortField = (typeof FOLDER_SORT_FIELDS)[number]

export interface CreateFolderData {
  code: string
  title: string
  description?: string | null
  status?: FolderStatus
  area: string
  subarea?: string | null
  client_id: number
  responsible_lawyer_id?: number | null
  metadata?: Record<string, unknown>
}

export type UpdateFolderData = Partial<CreateFolderData>

export interface FolderListInput {
  page?: number
  per_page?: number
  sort_by?: FolderSortField
  order?: 'asc' | 'desc'
  search?: string
  status?: FolderStatus
  area?: string
  client_id?: number
  responsible_lawyer_id?: number
}

export interface FolderListOptions {
  page: number
  perPage: number
  sortBy: FolderSortField
  direction: 'asc' | 'desc'
  search?: string
  status?: FolderStatus
  area?: string
  clientId?: number
  responsibleLawyerId?: number
}
