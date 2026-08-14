import { Link } from '@inertiajs/react'
import { CalendarClock, Gavel, MapPin, TriangleAlert, Video } from 'lucide-react'

import {
  categoryLabel,
  formatFullDate,
  formatTime,
  priorityLabel,
  statusLabel,
} from '~/components/calendar/calendar_labels'
import { cn } from '~/lib/utils'
import type { CalendarDay } from '~/types/calendar'

interface EventListProps {
  days: CalendarDay[]
  emptyMessage: string
}

export function EventList({ days, emptyMessage }: EventListProps) {
  if (days.length === 0) {
    return (
      <div className="rounded-[15px] bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {days.map((day) => (
        <section key={day.date} className="rounded-[15px] bg-white p-4 shadow-sm sm:p-6">
          <h2 className="font-semibold text-base text-yol-ink first-letter:uppercase">
            {formatFullDate(day.date)}
          </h2>

          <ul className="mt-4 flex flex-col gap-3">
            {day.events.map((event) => {
              const Icon = event.kind === 'hearing' ? Gavel : CalendarClock

              return (
                <li key={`${event.kind}-${event.id}`}>
                  <Link
                    href={event.url}
                    className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 transition hover:border-gray-200 hover:bg-gray-50"
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl',
                        event.kind === 'hearing'
                          ? 'bg-cyan-50 text-cyan-600'
                          : 'bg-amber-50 text-amber-600',
                        event.is_overdue && 'bg-red-50 text-red-600'
                      )}
                    >
                      <Icon className="size-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-yol-ink">{event.title}</strong>
                        {event.is_fatal && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-semibold text-[0.65rem] text-red-700">
                            <TriangleAlert className="size-3" /> Fatal
                          </span>
                        )}
                        {event.is_overdue && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-[0.65rem] text-red-700">
                            Em atraso
                          </span>
                        )}
                      </span>

                      <span className="mt-1 block text-xs text-gray-500">
                        {[
                          formatTime(event.occurs_at),
                          categoryLabel(event),
                          statusLabel(event.status),
                          event.priority ? priorityLabel(event.priority) : null,
                          event.folder_code,
                          event.assignee_name,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>

                      {(event.location || event.online_url) && (
                        <span className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" /> {event.location}
                            </span>
                          )}
                          {event.online_url && (
                            <span className="flex items-center gap-1">
                              <Video className="size-3" /> Sessão online
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
