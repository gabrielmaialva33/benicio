export interface ActivityCursor {
  occurred_at: string
  id: number
}

export interface ActivityListInput {
  limit?: number
  cursor?: string
  event_type?: string
}

export interface RecordActivityData {
  tenant_id: number
  folder_id: number
  process_id?: number | null
  actor_id?: number | null
  event_type: string
  summary: string
  data?: Record<string, unknown>
  occurred_at?: Date
}
