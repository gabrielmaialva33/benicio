export const PROCESS_STATUSES = ['active', 'suspended', 'archived', 'closed'] as const
export type ProcessStatus = (typeof PROCESS_STATUSES)[number]

export const PROCESS_INSTANCES = ['first', 'second', 'superior'] as const
export type ProcessInstance = (typeof PROCESS_INSTANCES)[number]

export const PROCESS_PHASES = ['knowledge', 'execution', 'appeal', 'sentence_compliance'] as const
export type ProcessPhase = (typeof PROCESS_PHASES)[number]

export const PROCESS_DISTRIBUTION_TYPES = ['lottery', 'dependency', 'prevention'] as const
export type ProcessDistributionType = (typeof PROCESS_DISTRIBUTION_TYPES)[number]

export const PROCESS_PARTY_SIDES = ['active', 'passive', 'third', 'other'] as const
export type ProcessPartySide = (typeof PROCESS_PARTY_SIDES)[number]

export const PROCESS_PARTY_PERSON_TYPES = ['individual', 'company'] as const
export type ProcessPartyPersonType = (typeof PROCESS_PARTY_PERSON_TYPES)[number]

export const PROCESS_SORT_FIELDS = [
  'id',
  'cnj_number',
  'status',
  'distribution_date',
  'entry_date',
  'created_at',
  'updated_at',
] as const
export type ProcessSortField = (typeof PROCESS_SORT_FIELDS)[number]

export interface ProcessPartyInput {
  side: ProcessPartySide
  role?: string | null
  is_primary?: boolean
  name: string
  document?: string | null
  person_type?: ProcessPartyPersonType | null
  metadata?: Record<string, unknown>
}

export interface PreparedProcessPartyData extends ProcessPartyInput {
  role: string | null
  is_primary: boolean
  document: string | null
  person_type: ProcessPartyPersonType | null
  metadata: Record<string, unknown>
}

export interface CreateProcessData {
  cnj_number?: string | null
  legacy_number?: string | null
  internal_code?: string | null
  status?: ProcessStatus
  instance?: ProcessInstance | null
  phase?: ProcessPhase | null
  distribution_type?: ProcessDistributionType | null
  electronic?: boolean | null
  is_primary?: boolean
  nature?: string | null
  action_type?: string | null
  tribunal?: string | null
  judicial_body?: string | null
  district?: string | null
  forum?: string | null
  court_division?: string | null
  judge?: string | null
  case_value?: string | number | null
  conviction_value?: string | number | null
  costs?: string | number | null
  fees?: string | number | null
  distribution_date?: string | null
  citation_date?: string | null
  entry_date?: string | null
  observation?: string | null
  object_detail?: string | null
  metadata?: Record<string, unknown>
  parties?: ProcessPartyInput[]
}

export type UpdateProcessData = Partial<CreateProcessData>

export interface ProcessListInput {
  page?: number
  per_page?: number
  sort_by?: ProcessSortField
  order?: 'asc' | 'desc'
  search?: string
  cnj_number?: string
  folder_id?: number
  client_id?: number
  status?: ProcessStatus
  instance?: ProcessInstance
  phase?: ProcessPhase
  electronic?: boolean
  is_primary?: boolean
  tribunal?: string
  district?: string
  judge?: string
  party_document?: string
  distribution_date_from?: string
  distribution_date_to?: string
}

export interface ProcessListOptions {
  page: number
  perPage: number
  sortBy: ProcessSortField
  direction: 'asc' | 'desc'
  search?: string
  cnjNumber?: string
  folderId?: number
  clientId?: number
  status?: ProcessStatus
  instance?: ProcessInstance
  phase?: ProcessPhase
  electronic?: boolean
  isPrimary?: boolean
  tribunal?: string
  district?: string
  judge?: string
  partyDocument?: string
  distributionDateFrom?: string
  distributionDateTo?: string
}
