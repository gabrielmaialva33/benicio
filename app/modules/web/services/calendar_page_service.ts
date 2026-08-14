import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

import type { CalendarDeadlineRow } from '#modules/deadlines/repositories/deadline_repository'
import DeadlineRepository from '#modules/deadlines/repositories/deadline_repository'
import type { CalendarHearingRow } from '#modules/hearings/repositories/hearing_repository'
import HearingRepository from '#modules/hearings/repositories/hearing_repository'
import type {
  CalendarView,
  WebCalendarData,
  WebCalendarDay,
  WebCalendarEvent,
} from '#modules/web/interfaces/calendar_page_interface'

/** Statuses where a deadline stops counting as pending. */
const CLOSED_DEADLINE_STATUSES = ['completed', 'cancelled']

/** Statuses where a hearing stops counting as pending. */
const CLOSED_HEARING_STATUSES = ['completed', 'cancelled']

function toDateTime(value: Date | string): DateTime {
  return value instanceof Date ? DateTime.fromJSDate(value) : DateTime.fromISO(String(value))
}

@inject()
export default class CalendarPageService {
  constructor(
    private hearingRepository: HearingRepository,
    private deadlineRepository: DeadlineRepository
  ) {}

  async index(
    tenantId: number,
    requestedMonth?: string,
    view: CalendarView = 'all'
  ): Promise<WebCalendarData> {
    const month = this.#resolveMonth(requestedMonth)
    const rangeStart = month.startOf('month')
    const rangeEnd = month.endOf('month')
    const now = DateTime.now()

    // Skip the query the current scope does not ask for.
    const hearings =
      view === 'deadlines'
        ? []
        : await this.hearingRepository.listBetween(
            tenantId,
            rangeStart.toJSDate(),
            rangeEnd.toJSDate()
          )
    const deadlines =
      view === 'hearings'
        ? []
        : await this.deadlineRepository.listBetween(
            tenantId,
            rangeStart.toJSDate(),
            rangeEnd.toJSDate()
          )

    const events = [
      ...hearings.map((hearing) => this.#mapHearing(hearing, now)),
      ...deadlines.map((deadline) => this.#mapDeadline(deadline, now)),
    ].sort((first, second) => first.occurs_at.localeCompare(second.occurs_at))

    return {
      month: month.toFormat('yyyy-MM'),
      previous_month: month.minus({ months: 1 }).toFormat('yyyy-MM'),
      next_month: month.plus({ months: 1 }).toFormat('yyyy-MM'),
      today: now.toFormat('yyyy-MM-dd'),
      view,
      days: this.#groupByDay(events),
      summary: {
        hearings: events.filter((event) => event.kind === 'hearing').length,
        deadlines: events.filter((event) => event.kind === 'deadline').length,
        overdue: events.filter((event) => event.is_overdue).length,
        fatal: events.filter((event) => event.is_fatal).length,
      },
    }
  }

  /** A missing or malformed month falls back to the current one instead of throwing. */
  #resolveMonth(requestedMonth?: string): DateTime {
    if (requestedMonth) {
      const parsed = DateTime.fromFormat(requestedMonth, 'yyyy-MM')
      if (parsed.isValid) return parsed
    }

    return DateTime.now().startOf('month')
  }

  #mapHearing(hearing: CalendarHearingRow, now: DateTime): WebCalendarEvent {
    const startsAt = toDateTime(hearing.starts_at)
    const endsAt = hearing.ends_at ? toDateTime(hearing.ends_at) : null

    return {
      id: hearing.id,
      kind: 'hearing',
      title: hearing.title,
      occurs_at: startsAt.toISO()!,
      ends_at: endsAt?.toISO() ?? null,
      status: hearing.status,
      category: hearing.type,
      location: hearing.location,
      online_url: hearing.online_url,
      priority: null,
      is_fatal: false,
      is_overdue: startsAt < now && !CLOSED_HEARING_STATUSES.includes(hearing.status),
      assignee_name: null,
      folder_id: hearing.folder_id,
      folder_code: hearing.folder_code,
      process_id: hearing.process_id,
      url: `/folders/${hearing.folder_id}/processes/${hearing.process_id}`,
    }
  }

  #mapDeadline(deadline: CalendarDeadlineRow, now: DateTime): WebCalendarEvent {
    const dueAt = toDateTime(deadline.due_at)

    return {
      id: deadline.id,
      kind: 'deadline',
      title: deadline.title,
      occurs_at: dueAt.toISO()!,
      ends_at: null,
      status: deadline.status,
      category: deadline.kind,
      location: null,
      online_url: null,
      priority: deadline.priority,
      is_fatal: deadline.is_fatal,
      is_overdue: dueAt < now && !CLOSED_DEADLINE_STATUSES.includes(deadline.status),
      assignee_name: deadline.assignee_name,
      folder_id: deadline.folder_id,
      folder_code: deadline.folder_code,
      process_id: deadline.process_id,
      url: `/folders/${deadline.folder_id}`,
    }
  }

  /** Only days holding events are returned; the calendar fills the empty ones. */
  #groupByDay(events: WebCalendarEvent[]): WebCalendarDay[] {
    const eventsByDay = new Map<string, WebCalendarEvent[]>()

    for (const event of events) {
      const day = event.occurs_at.slice(0, 10)
      const dayEvents = eventsByDay.get(day)
      if (dayEvents) {
        dayEvents.push(event)
      } else {
        eventsByDay.set(day, [event])
      }
    }

    return [...eventsByDay.entries()]
      .map(([date, dayEvents]) => ({ date, events: dayEvents }))
      .sort((first, second) => first.date.localeCompare(second.date))
  }
}
