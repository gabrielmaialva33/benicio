import { StatusBadge } from '~/components/shared/status_badge'
import { FOLDER_STATUS_LABELS } from '~/lib/labels'
import type { FolderStatus } from '~/types/folder'

export function FolderStatusBadge({
  status,
  className,
}: {
  status: FolderStatus
  className?: string
}) {
  return <StatusBadge status={status} labels={FOLDER_STATUS_LABELS} className={className} />
}

export function folderStatusLabel(status: FolderStatus) {
  return FOLDER_STATUS_LABELS[status]
}
