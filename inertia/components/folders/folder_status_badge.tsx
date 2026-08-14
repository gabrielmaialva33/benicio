import { cn } from '~/lib/utils'
import type { FolderStatus } from '~/types/folder'

const statusCopy: Record<FolderStatus, string> = {
  active: 'Ativa',
  completed: 'Concluída',
  pending: 'Pendente',
  cancelled: 'Cancelada',
  archived: 'Arquivada',
}

const statusClasses: Record<FolderStatus, string> = {
  active:
    'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300',
  completed:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
  pending:
    'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300',
  cancelled:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300',
  archived:
    'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
}

export function FolderStatusBadge({
  status,
  className,
}: {
  status: FolderStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold',
        statusClasses[status],
        className
      )}
    >
      {statusCopy[status]}
    </span>
  )
}

export function folderStatusLabel(status: FolderStatus) {
  return statusCopy[status]
}
