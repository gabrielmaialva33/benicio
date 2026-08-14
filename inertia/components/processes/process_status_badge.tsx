import { cn } from '~/lib/utils'
import type { ProcessStatus } from '~/types/process'
import { processStatusLabels } from './process_formatters'

const tones: Record<ProcessStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  suspended: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  archived: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  closed: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
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
