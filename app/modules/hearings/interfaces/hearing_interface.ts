export const HEARING_TYPES = [
  'audience',
  'judgment',
  'conciliation',
  'instruction',
  'other',
] as const
export const HEARING_STATUSES = ['scheduled', 'completed', 'cancelled', 'postponed'] as const
export const HEARING_SORT_FIELDS = ['id', 'starts_at', 'created_at', 'status', 'title'] as const

export type HearingType = (typeof HEARING_TYPES)[number]
export type HearingStatus = (typeof HEARING_STATUSES)[number]

export interface HearingAttendeeInput {
  user_id: number
  role?: string | null
  is_required?: boolean
}

export interface HearingListInput {
  page?: number
  per_page?: number
  sort_by?: (typeof HEARING_SORT_FIELDS)[number]
  order?: 'asc' | 'desc'
  search?: string
  type?: HearingType
  status?: HearingStatus
  process_id?: number
  folder_id?: number
  attendee_id?: number
  from?: Date
  to?: Date
}

export interface CreateHearingData {
  process_id: number
  title: string
  description?: string | null
  type: HearingType
  status?: HearingStatus
  starts_at: Date
  ends_at?: Date | null
  location?: string | null
  online_url?: string | null
  judge?: string | null
  notes?: string | null
  result?: string | null
  attendees?: HearingAttendeeInput[]
  metadata?: Record<string, unknown>
}

export type UpdateHearingData = Partial<CreateHearingData>
