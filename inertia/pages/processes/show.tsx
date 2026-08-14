import { Head, usePage } from '@inertiajs/react'

import { ProcessDetailContent } from '~/components/processes/process_detail_content'
import { formatProcessIdentifier } from '~/components/processes/process_formatters'
import { MainLayout } from '~/layouts'
import type { ProcessFolder, ProcessItem } from '~/types/process'

interface SharedFlashProps {
  flash?: { success?: string | null; error?: string | null }
}

export default function ProcessDetailPage({
  folder,
  process,
}: {
  folder: ProcessFolder
  process: ProcessItem
}) {
  const { flash } = usePage().props as SharedFlashProps

  return (
    <MainLayout>
      <Head title={formatProcessIdentifier(process)} />
      <ProcessDetailContent
        folder={folder}
        process={process}
        successMessage={flash?.success}
        errorMessage={flash?.error}
      />
    </MainLayout>
  )
}
