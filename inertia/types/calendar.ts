export type CalendarView = 'all' | 'hearings' | 'deadlines'

export interface CalendarEvent {
  id: number
  kind: 'hearing' | 'deadline'
  title: string
  occurs_at: string
  ends_at: string | null
  status: string
  category: string
  location: string | null
  online_url: string | null
  priority: string | null
  is_fatal: boolean
  is_overdue: boolean
  assignee_name: string | null
  folder_id: number
  folder_code: string
  process_id: number | null
  url: string
}

export interface CalendarDay {
  date: string
  events: CalendarEvent[]
}

export interface CalendarSummary {
  hearings: number
  deadlines: number
  overdue: number
  fatal: number
}

export interface CalendarPageProps {
  month: string
  previous_month: string
  next_month: string
  today: string
  view: CalendarView
  days: CalendarDay[]
  summary: CalendarSummary
}
