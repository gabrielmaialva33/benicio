export type FolderStatus = 'active' | 'completed' | 'pending' | 'cancelled' | 'archived'

export type FolderSortField =
  'id' | 'code' | 'title' | 'status' | 'area' | 'created_at' | 'updated_at'

export interface FolderClient {
  id: number
  name: string
  document: string
  person_type: string
  email: string | null
}

export interface FolderLawyer {
  id: number
  full_name: string
  email: string
}

export interface FolderItem {
  id: number
  code: string
  title: string
  description: string | null
  status: FolderStatus
  area: string
  subarea: string | null
  client: FolderClient
  responsible_lawyer: FolderLawyer | null
  created_at: string
  updated_at: string
}

export interface FolderPaginationMeta {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface FolderFilters {
  search: string
  status: FolderStatus | null
  area: string
  sort_by: FolderSortField
  order: 'asc' | 'desc'
  per_page: number
}

export interface FolderStatusCount {
  status: FolderStatus
  count: number
}

export interface FolderFormOptions {
  clients: FolderClient[]
  lawyers: FolderLawyer[]
  areas: string[]
}

export interface FolderDetailStats {
  processes_total: number
  tasks_open: number
  deadlines_open: number
  documents_total: number
}

export interface FolderProcessParty {
  id: number
  side: string
  role: string | null
  is_primary: boolean
  name: string
  document: string | null
}

export interface FolderProcess {
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
  parties: FolderProcessParty[]
}

export interface FolderDeadline {
  id: number
  title: string
  kind: string
  status: string
  priority: string
  is_fatal: boolean
  due_at: string
  assignee_name: string | null
}

export interface FolderActivity {
  id: number
  event_type: string
  summary: string
  occurred_at: string
  actor_name: string | null
}
