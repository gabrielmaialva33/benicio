import { cn } from '~/lib/utils'
import type { CalendarDay } from '~/types/calendar'

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface MonthGridProps {
  /** Displayed month as `YYYY-MM`. */
  month: string
  /** Today as `YYYY-MM-DD`, resolved server-side. */
  today: string
  days: CalendarDay[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
}

interface GridCell {
  date: string
  dayNumber: number
  isCurrentMonth: boolean
}

/**
 * Builds the 6x7 grid, padding with the neighbouring months so every week row
 * is complete. Dates are assembled as strings to avoid timezone drift.
 */
function buildCells(month: string): GridCell[] {
  const [year, monthNumber] = month.split('-').map(Number)
  const firstOfMonth = new Date(year, monthNumber - 1, 1)
  const gridStart = new Date(year, monthNumber - 1, 1 - firstOfMonth.getDay())

  return Array.from({ length: 42 }, (_, offset) => {
    const cellDate = new Date(gridStart)
    cellDate.setDate(gridStart.getDate() + offset)

    const isoDate = [
      cellDate.getFullYear(),
      String(cellDate.getMonth() + 1).padStart(2, '0'),
      String(cellDate.getDate()).padStart(2, '0'),
    ].join('-')

    return {
      date: isoDate,
      dayNumber: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === monthNumber - 1,
    }
  })
}

export function MonthGrid({ month, today, days, selectedDate, onSelectDate }: MonthGridProps) {
  const eventsByDate = new Map(days.map((day) => [day.date, day.events]))
  const cells = buildCells(month)

  return (
    <div className="rounded-[15px] bg-white p-4 shadow-sm sm:p-6">
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {WEEKDAY_LABELS.map((weekday) => (
          <div
            key={weekday}
            className="pb-2 text-center font-semibold text-xs uppercase text-gray-400"
          >
            {weekday}
          </div>
        ))}

        {cells.map((cell) => {
          const events = eventsByDate.get(cell.date) ?? []
          const hasHearing = events.some((event) => event.kind === 'hearing')
          const hasDeadline = events.some((event) => event.kind === 'deadline')
          const hasOverdue = events.some((event) => event.is_overdue)
          const isToday = cell.date === today
          const isSelected = cell.date === selectedDate

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onSelectDate(cell.date)}
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${cell.dayNumber}, ${events.length} evento(s)`}
              className={cn(
                'flex min-h-[68px] flex-col items-center gap-1.5 rounded-lg border border-transparent p-2 transition sm:min-h-[84px]',
                cell.isCurrentMonth ? 'text-yol-ink' : 'text-gray-300',
                events.length > 0 && cell.isCurrentMonth && 'bg-gray-50 hover:bg-gray-100',
                events.length === 0 && 'hover:bg-gray-50',
                isSelected && 'border-orange-500 bg-orange-50 hover:bg-orange-50'
              )}
            >
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-full font-semibold text-sm',
                  isToday && 'bg-yol-ink text-white'
                )}
              >
                {cell.dayNumber}
              </span>

              {events.length > 0 && (
                <span className="flex items-center gap-1">
                  {hasHearing && <span className="size-1.5 rounded-full bg-cyan-500" />}
                  {hasDeadline && (
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        hasOverdue ? 'bg-red-500' : 'bg-amber-500'
                      )}
                    />
                  )}
                  <span className="font-medium text-[0.65rem] text-gray-500">{events.length}</span>
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-cyan-500" /> Audiências
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500" /> Prazos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red-500" /> Em atraso
        </span>
      </div>
    </div>
  )
}
