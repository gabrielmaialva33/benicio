export const DOCUMENT_SORT_FIELDS = ['id', 'created_at', 'updated_at', 'title', 'version'] as const

export interface DocumentListInput {
  page?: number
  per_page?: number
  sort_by?: (typeof DOCUMENT_SORT_FIELDS)[number]
  order?: 'asc' | 'desc'
  search?: string
  folder_id?: number
  process_id?: number
  file_id?: number
  document_type?: string
  is_signed?: boolean
}

export interface CreateDocumentData {
  folder_id: number
  process_id?: number | null
  file_id: number
  document_type: string
  title: string
  description?: string | null
  version?: number
  is_signed?: boolean
  metadata?: Record<string, unknown>
}

export type UpdateDocumentData = Partial<
  Pick<
    CreateDocumentData,
    'process_id' | 'document_type' | 'title' | 'description' | 'version' | 'is_signed' | 'metadata'
  >
>
