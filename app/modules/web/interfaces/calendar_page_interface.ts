/** Agenda scopes, mirroring the legacy system menu. */
export const CALENDAR_VIEWS = ['all', 'hearings', 'deadlines'] as const

export type CalendarView = (typeof CALENDAR_VIEWS)[number]

/**
 * Normalized event: hearings and deadlines have different columns, but the
 * agenda renders and sorts both through the same contract.
 */
export type WebCalendarEvent = {
  id: number
  kind: 'hearing' | 'deadline'
  title: string
  /** Timestamp that places the event on the calendar (start or due date). */
  occurs_at: string
  ends_at: string | null
  status: string
  /** Hearing type or deadline nature. */
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
  /** Click target — always the originating folder or process. */
  url: string
}

export type WebCalendarDay = {
  /** ISO date, `YYYY-MM-DD`. */
  date: string
  events: WebCalendarEvent[]
}

export type WebCalendarSummary = {
  hearings: number
  deadlines: number
  overdue: number
  fatal: number
}

export type WebCalendarData = {
  /** Displayed month, as `YYYY-MM`. */
  month: string
  previous_month: string
  next_month: string
  /** Today as ISO `YYYY-MM-DD`, resolved server-side to match the timezone. */
  today: string
  view: CalendarView
  days: WebCalendarDay[]
  summary: WebCalendarSummary
}
