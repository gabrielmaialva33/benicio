/*
|--------------------------------------------------------------------------
| Formatting
|--------------------------------------------------------------------------
|
| Single source for turning API values into pt-BR copy. Nine components used
| to carry their own `formatDate`, which is how "10 de ago" and "10/08/2026"
| ended up next to each other in the same screen — and how one of them lost
| the timezone and rendered a different civil date on the server than in the
| browser.
|
| Everything here pins `APP_TIME_ZONE` so SSR and hydration agree.
|
*/

import { APP_TIME_ZONE } from '~/lib/date'

/** `pt-BR` abbreviates months as "ago." — the trailing dot reads as a typo. */
function withoutTrailingDot(value: string) {
  return value.replace('.', '')
}

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** `10 ago 2026`. Returns `fallback` for null/unparseable input. */
export function formatDate(value: string | Date | null | undefined, fallback = '—') {
  const date = parseDate(value)
  if (!date) return fallback

  return withoutTrailingDot(
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: APP_TIME_ZONE,
    }).format(date)
  )
}

/** `10 ago 2026, 14:30`. */
export function formatDateTime(value: string | Date | null | undefined, fallback = '—') {
  const date = parseDate(value)
  if (!date) return fallback

  return withoutTrailingDot(
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: APP_TIME_ZONE,
    }).format(date)
  )
}

/** `10 ago` — for dense lists where the year is implied. */
export function formatShortDate(value: string | Date | null | undefined, fallback = '') {
  const date = parseDate(value)
  if (!date) return fallback

  return withoutTrailingDot(
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      timeZone: APP_TIME_ZONE,
    }).format(date)
  )
}

/** `ago` from a `YYYY-MM` bucket — chart axes and monthly breakdowns. */
export function formatMonth(value: string) {
  const date = parseDate(`${value}-01T12:00:00Z`)
  if (!date) return value

  return withoutTrailingDot(
    new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: APP_TIME_ZONE }).format(date)
  )
}

/**
 * Money arrives from the API as a decimal string (`numeric(18,2)`), never as a
 * float, so it is parsed here and nowhere else.
 */
export function formatCurrency(value: string | number | null | undefined, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback

  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount)) return fallback

  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value)
}

/** `1,2 MB` — upload lists and file cards. */
export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 bytes'

  const units = ['bytes', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const size = bytes / 1024 ** exponent

  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(size)} ${units[exponent]}`
}
