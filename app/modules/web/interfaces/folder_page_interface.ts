import type { FolderSortField, FolderStatus } from '#modules/folders/interfaces/folder_interface'

export type WebPaginationMeta = {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export type WebFolderClient = {
  id: number
  name: string
  document: string
  person_type: string
  email: string | null
}

export type WebFolderLawyer = {
  id: number
  full_name: string
  email: string
}

export type WebFolder = {
  id: number
  code: string
  title: string
  description: string | null
  status: FolderStatus
  area: string
  subarea: string | null
  client: WebFolderClient
  responsible_lawyer: WebFolderLawyer | null
  created_at: string
  updated_at: string
}

export type WebFolderFilters = {
  search: string
  status: FolderStatus | null
  area: string
  sort_by: FolderSortField
  order: 'asc' | 'desc'
  per_page: number
}

export type WebFolderStatusCount = {
  status: FolderStatus
  count: number
}

export type WebFolderIndexData = {
  folders: {
    data: WebFolder[]
    meta: WebPaginationMeta
  }
  filters: WebFolderFilters
  areas: string[]
  status_counts: WebFolderStatusCount[]
  total_count: number
}

export type WebFolderFormOptions = {
  clients: WebFolderClient[]
  lawyers: WebFolderLawyer[]
  areas: string[]
  selected_client_id?: number | null
}

export type WebFolderDetailStats = {
  processes_total: number
  tasks_open: number
  deadlines_open: number
  documents_total: number
}

export type WebFolderProcessParty = {
  id: number
  side: string
  role: string | null
  is_primary: boolean
  name: string
  document: string | null
}

export type WebFolderProcess = {
  id: number
  cnj_number: string | null
  legacy_number: string | null
  internal_code: string | null
  status: string
  instance: string | null
  phase: string | null
  is_primary: boolean
  nature: string | null
  action_type: string | null
  tribunal: string | null
  district: string | null
  court_division: string | null
  judge: string | null
  case_value: string | null
  entry_date: string | null
  created_at: string
  parties: WebFolderProcessParty[]
}

export type WebFolderDeadline = {
  id: number
  title: string
  kind: string
  status: string
  priority: string
  is_fatal: boolean
  due_at: string
  assignee_name: string | null
}

export type WebFolderActivity = {
  id: number
  event_type: string
  summary: string
  occurred_at: string
  actor_name: string | null
}

export type WebFolderDetailData = {
  folder: WebFolder
  stats: WebFolderDetailStats
  processes: WebFolderProcess[]
  deadlines: WebFolderDeadline[]
  activities: WebFolderActivity[]
}
