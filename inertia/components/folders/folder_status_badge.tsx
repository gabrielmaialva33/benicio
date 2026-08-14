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
  active: 'border-blue-200 bg-blue-50 text-blue-700',
  completed: 'border-green-200 bg-green-50 text-green-700',
  pending: 'border-orange-200 bg-orange-50 text-orange-700',
  cancelled: 'border-red-200 bg-red-50 text-red-700',
  archived: 'border-gray-200 bg-gray-50 text-gray-700',
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
        'inline-flex min-w-16 items-center justify-center rounded-md border px-2.5 py-1 text-xs font-semibold',
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
