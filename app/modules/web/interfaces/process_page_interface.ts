import type {
  ProcessDistributionType,
  ProcessInstance,
  ProcessPartyPersonType,
  ProcessPartySide,
  ProcessPhase,
  ProcessStatus,
} from '#modules/processes/interfaces/process_interface'

export type WebProcessFolder = {
  id: number
  code: string
  title: string
  area: string
  client: {
    id: number
    name: string
  }
}

export type WebProcessParty = {
  id: number
  side: ProcessPartySide
  role: string | null
  is_primary: boolean
  name: string
  document: string | null
  person_type: ProcessPartyPersonType | null
}

export type WebProcess = {
  id: number
  folder_id: number
  cnj_number: string | null
  legacy_number: string | null
  internal_code: string | null
  status: ProcessStatus
  instance: ProcessInstance | null
  phase: ProcessPhase | null
  distribution_type: ProcessDistributionType | null
  electronic: boolean | null
  is_primary: boolean
  nature: string | null
  action_type: string | null
  tribunal: string | null
  judicial_body: string | null
  district: string | null
  forum: string | null
  court_division: string | null
  judge: string | null
  case_value: string | null
  conviction_value: string | null
  costs: string | null
  fees: string | null
  distribution_date: string | null
  citation_date: string | null
  entry_date: string | null
  observation: string | null
  object_detail: string | null
  created_at: string
  updated_at: string
  parties: WebProcessParty[]
}

export type WebProcessFormData = {
  folder: WebProcessFolder
  process?: WebProcess
}

export type WebProcessDetailData = {
  folder: WebProcessFolder
  process: WebProcess
}
