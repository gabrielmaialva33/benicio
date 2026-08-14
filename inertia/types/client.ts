export type ClientPersonType = 'individual' | 'company'

export type ClientSortField = 'id' | 'name' | 'document' | 'created_at' | 'updated_at'

export interface ClientAddress {
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
}

export interface ClientItem {
  id: number
  name: string
  document: string
  person_type: ClientPersonType
  email: string | null
  phone: string | null
  address: ClientAddress | null
  notes: string | null
  folders_total: number
  active_folders: number
  created_at: string
  updated_at: string
}

export interface ClientFolder {
  id: number
  code: string
  title: string
  status: 'active' | 'completed' | 'pending' | 'cancelled' | 'archived'
  area: string
  subarea: string | null
  created_at: string
}

export interface ClientPaginationMeta {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface ClientFilters {
  search: string
  person_type: ClientPersonType | null
  sort_by: ClientSortField
  order: 'asc' | 'desc'
  per_page: number
}

export interface ClientStats {
  total: number
  individuals: number
  companies: number
  with_active_folders: number
}
