import { Head } from '@inertiajs/react'

import { formatProcessIdentifier } from '~/components/processes/process_formatters'
import { ProcessForm } from '~/components/processes/process_form'
import { MainLayout } from '~/layouts'
import type { ProcessFolder, ProcessItem } from '~/types/process'

export default function EditProcessPage({
  folder,
  process,
}: {
  folder: ProcessFolder
  process: ProcessItem
}) {
  return (
    <MainLayout>
      <Head title={`Editar ${formatProcessIdentifier(process)}`} />
      <div className="space-y-8">
        <ProcessForm folder={folder} process={process} />
      </div>
    </MainLayout>
  )
}
