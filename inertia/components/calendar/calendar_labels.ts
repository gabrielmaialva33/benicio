import type { CalendarEvent } from '~/types/calendar'

const HEARING_TYPE_LABELS: Record<string, string> = {
  audience: 'Audiência',
  judgment: 'Julgamento',
  conciliation: 'Conciliação',
  instruction: 'Instrução',
  other: 'Outro',
}

const DEADLINE_KIND_LABELS: Record<string, string> = {
  judicial: 'Judicial',
  extrajudicial: 'Extrajudicial',
  administrative: 'Administrativo',
  internal: 'Interno',
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendada',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  postponed: 'Adiada',
  pending: 'Pendente',
  in_progress: 'Em andamento',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
}

/** Falls back to the raw value so an unmapped enum still renders something. */
export function categoryLabel(event: CalendarEvent): string {
  const dictionary = event.kind === 'hearing' ? HEARING_TYPE_LABELS : DEADLINE_KIND_LABELS
  return dictionary[event.category] ?? event.category
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

export function priorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority] ?? priority
}

export function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatFullDate(isoDay: string): string {
  // Anchored at noon so the day never shifts due to timezone offsets.
  return new Date(`${isoDay}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

export function formatMonth(month: string): string {
  const label = new Date(`${month}-01T12:00:00`).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
