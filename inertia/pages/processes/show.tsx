import { Head } from '@inertiajs/react'

import { ProcessDetailContent } from '~/components/processes/process_detail_content'
import { formatProcessIdentifier } from '~/components/processes/process_formatters'
import { MainLayout } from '~/layouts'
import type { ProcessFolder, ProcessItem } from '~/types/process'

export default function ProcessDetailPage({
  folder,
  process,
}: {
  folder: ProcessFolder
  process: ProcessItem
}) {
  return (
    <MainLayout>
      <Head title={formatProcessIdentifier(process)} />
      <ProcessDetailContent folder={folder} process={process} />
    </MainLayout>
  )
}
