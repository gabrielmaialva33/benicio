import type {
  ClientPersonType,
  ClientSortField,
} from '#modules/clients/interfaces/client_interface'
import type { FolderStatus } from '#modules/folders/interfaces/folder_interface'
import type { WebPaginationMeta } from '#modules/web/interfaces/folder_page_interface'

export type WebClientAddress = {
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
}

export type WebClient = {
  id: number
  name: string
  document: string
  person_type: ClientPersonType
  email: string | null
  phone: string | null
  address: WebClientAddress | null
  notes: string | null
  folders_total: number
  active_folders: number
  created_at: string
  updated_at: string
}

export type WebClientFolder = {
  id: number
  code: string
  title: string
  status: FolderStatus
  area: string
  subarea: string | null
  created_at: string
}

export type WebClientFilters = {
  search: string
  person_type: ClientPersonType | null
  sort_by: ClientSortField
  order: 'asc' | 'desc'
  per_page: number
}

export type WebClientStats = {
  total: number
  individuals: number
  companies: number
  with_active_folders: number
}

export type WebClientIndexData = {
  clients: {
    data: WebClient[]
    meta: WebPaginationMeta
  }
  filters: WebClientFilters
  stats: WebClientStats
}

export type WebClientDetailData = {
  client: WebClient
  folders: WebClientFolder[]
}
