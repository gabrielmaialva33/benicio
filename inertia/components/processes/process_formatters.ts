import { APP_TIME_ZONE } from '~/lib/date'

export function formatCnj(value: string | null) {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 20) return value
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`
}

export function formatProcessIdentifier(process: {
  id: number
  cnj_number: string | null
  legacy_number: string | null
  internal_code: string | null
}) {
  return (
    formatCnj(process.cnj_number) ??
    process.legacy_number ??
    process.internal_code ??
    `Processo #${process.id}`
  )
}

export function formatProcessCurrency(value: string | null) {
  if (!value) return null
  const amount = Number(value)
  if (!Number.isFinite(amount)) return value
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
}

export function formatProcessDate(value: string | null, withTime: boolean = false) {
  if (!value) return null
  const date = new Date(withTime ? value : `${value}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeZone: APP_TIME_ZONE,
    ...(withTime ? { timeStyle: 'short' as const } : {}),
  }).format(date)
}
