import { cn } from '~/lib/utils'
import type { ProcessStatus } from '~/types/process'
import { processStatusLabels } from './process_formatters'

const tones: Record<ProcessStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  suspended: 'bg-amber-50 text-amber-700',
  archived: 'bg-slate-100 text-slate-600',
  closed: 'bg-violet-50 text-violet-700',
}

export function ProcessStatusBadge({
  status,
  className,
}: {
  status: ProcessStatus
  className?: string
}) {
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', tones[status], className)}>
      {processStatusLabels[status]}
    </span>
  )
}
