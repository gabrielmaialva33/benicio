import { Head, router } from '@inertiajs/react'
import { CalendarClock, ChevronLeft, ChevronRight, Gavel, TriangleAlert } from 'lucide-react'
import { useState } from 'react'

import { formatMonth } from '~/components/calendar/calendar_labels'
import { EventList } from '~/components/calendar/event_list'
import { MonthGrid } from '~/components/calendar/month_grid'
import { MainLayout } from '~/layouts'
import { cn } from '~/lib/utils'
import type { CalendarPageProps, CalendarView } from '~/types/calendar'

const VIEW_TABS: Array<{ value: CalendarView; label: string }> = [
  { value: 'all', label: 'Tudo' },
  { value: 'hearings', label: 'Audiências' },
  { value: 'deadlines', label: 'Prazos' },
]

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof Gavel
  tone: 'cyan' | 'amber' | 'red'
}) {
  const tones = {
    cyan: 'bg-cyan-50 text-cyan-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  }

  return (
    <div className="flex items-center gap-3 rounded-[15px] bg-white p-4 shadow-sm">
      <span className={cn('flex size-10 items-center justify-center rounded-xl', tones[tone])}>
        <Icon className="size-5" />
      </span>
      <span>
        <strong className="block font-semibold text-2xl text-yol-ink">{value}</strong>
        <span className="text-xs text-gray-500">{label}</span>
      </span>
    </div>
  )
}

export default function CalendarPage({
  month,
  previous_month,
  next_month,
  today,
  view,
  days,
  summary,
}: CalendarPageProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const goTo = (nextMonth: string, nextView: CalendarView = view) => {
    router.get('/calendar', { month: nextMonth, view: nextView }, { preserveScroll: true })
  }

  const visibleDays = selectedDate ? days.filter((day) => day.date === selectedDate) : days
  const emptyMessage = selectedDate
    ? 'Nenhum compromisso nesse dia.'
    : 'Nenhum compromisso neste mês.'

  return (
    <MainLayout>
      <Head title="Agenda" />

      <div className="flex flex-col gap-5 px-4 pb-10 sm:px-6 lg:px-[30px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goTo(previous_month)}
              aria-label="Mês anterior"
              className="flex size-9 items-center justify-center rounded-md bg-white text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              <ChevronLeft className="size-5" />
            </button>
            <strong className="min-w-[170px] text-center font-semibold text-lg text-yol-ink">
              {formatMonth(month)}
            </strong>
            <button
              type="button"
              onClick={() => goTo(next_month)}
              aria-label="Próximo mês"
              className="flex size-9 items-center justify-center rounded-md bg-white text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              <ChevronRight className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(null)
                goTo(today.slice(0, 7))
              }}
              className="ml-1 rounded-md bg-white px-3 py-2 font-semibold text-sm text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              Hoje
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-md bg-white p-1 shadow-sm">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => goTo(month, tab.value)}
                aria-pressed={view === tab.value}
                className={cn(
                  'rounded px-3 py-1.5 font-semibold text-sm transition',
                  view === tab.value
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Audiências no mês"
            value={summary.hearings}
            icon={Gavel}
            tone="cyan"
          />
          <SummaryCard
            label="Prazos no mês"
            value={summary.deadlines}
            icon={CalendarClock}
            tone="amber"
          />
          <SummaryCard label="Em atraso" value={summary.overdue} icon={TriangleAlert} tone="red" />
          <SummaryCard
            label="Prazos fatais"
            value={summary.fatal}
            icon={TriangleAlert}
            tone="red"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <MonthGrid
            month={month}
            today={today}
            days={days}
            selectedDate={selectedDate}
            onSelectDate={(date) => setSelectedDate(date === selectedDate ? null : date)}
          />

          <div className="flex flex-col gap-3">
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="self-start rounded-md bg-white px-3 py-2 font-semibold text-sm text-gray-600 shadow-sm transition hover:bg-gray-50"
              >
                Ver o mês inteiro
              </button>
            )}
            <EventList days={visibleDays} emptyMessage={emptyMessage} />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
