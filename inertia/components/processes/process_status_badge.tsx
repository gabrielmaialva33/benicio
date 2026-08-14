import { StatusBadge } from '~/components/shared/status_badge'
import { PROCESS_STATUS_LABELS } from '~/lib/labels'
import type { ProcessStatus } from '~/types/process'

/**
 * Thin wrapper so process screens keep a named component while the tone and
 * the shape come from the shared `StatusBadge`.
 */
export function ProcessStatusBadge({
  status,
  className,
}: {
  status: ProcessStatus
  className?: string
}) {
  return <StatusBadge status={status} labels={PROCESS_STATUS_LABELS} className={className} />
}
