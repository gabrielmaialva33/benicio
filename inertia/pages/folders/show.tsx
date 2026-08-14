import { Head } from '@inertiajs/react'

import { FolderDetailContent } from '~/components/folders/folder_detail_content'
import { useFlash } from '~/hooks/use_flash'
import { MainLayout } from '~/layouts'
import type {
  FolderActivity,
  FolderDeadline,
  FolderDetailStats,
  FolderItem,
  FolderProcess,
} from '~/types/folder'

interface FolderDetailPageProps {
  folder: FolderItem
  stats: FolderDetailStats
  processes: FolderProcess[]
  deadlines: FolderDeadline[]
  activities: FolderActivity[]
}

export default function FolderDetailPage(props: FolderDetailPageProps) {
  const flash = useFlash()

  return (
    <MainLayout>
      <Head title={`${props.folder.code} · ${props.folder.title}`} />
      <FolderDetailContent {...props} successMessage={flash?.success} />
    </MainLayout>
  )
}
