export const CLIENT_PERSON_TYPES = ['individual', 'company'] as const
export type ClientPersonType = (typeof CLIENT_PERSON_TYPES)[number]

export const CLIENT_SORT_FIELDS = ['id', 'name', 'document', 'created_at', 'updated_at'] as const
export type ClientSortField = (typeof CLIENT_SORT_FIELDS)[number]

export interface ClientAddress {
  street?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
}

export interface CreateClientData {
  name: string
  document: string
  person_type: ClientPersonType
  email?: string | null
  phone?: string | null
  address?: ClientAddress | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

export type UpdateClientData = Partial<CreateClientData>

export interface ClientListInput {
  page?: number
  per_page?: number
  sort_by?: ClientSortField
  order?: 'asc' | 'desc'
  search?: string
  person_type?: ClientPersonType
}

export interface ClientListOptions {
  page: number
  perPage: number
  sortBy: ClientSortField
  direction: 'asc' | 'desc'
  search?: string
  personType?: ClientPersonType
}
