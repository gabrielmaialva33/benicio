import { Head } from '@inertiajs/react'

import { ProcessForm } from '~/components/processes/process_form'
import { MainLayout } from '~/layouts'
import type { ProcessFolder } from '~/types/process'

export default function CreateProcessPage({ folder }: { folder: ProcessFolder }) {
  return (
    <MainLayout>
      <Head title={`Novo processo · ${folder.code}`} />
      <div className="space-y-8">
        <ProcessForm folder={folder} />
      </div>
    </MainLayout>
  )
}
