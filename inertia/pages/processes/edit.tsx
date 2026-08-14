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
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-[-0.035em] text-slate-900 dark:text-white">
            Editar processo
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Pasta {folder.code} · alterações preservam os vínculos do processo.
          </p>
        </div>
        <ProcessForm folder={folder} process={process} />
      </div>
    </MainLayout>
  )
}
