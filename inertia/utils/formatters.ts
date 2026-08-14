/**
 * Kept as a re-export so the legacy `~/utils` barrel keeps working while
 * `~/lib/format` is the single implementation. Import from `~/lib/format` in
 * new code.
 */
export {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatFileSize,
  formatMonth,
  formatNumber,
  formatShortDate,
} from '~/lib/format'
