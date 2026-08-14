import { Head } from '@inertiajs/react'

import { ProcessForm } from '~/components/processes/process_form'
import { MainLayout } from '~/layouts'
import type { ProcessFolder } from '~/types/process'

export default function CreateProcessPage({ folder }: { folder: ProcessFolder }) {
  return (
    <MainLayout>
      <Head title={`Novo processo · ${folder.code}`} />
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-[-0.035em] text-slate-900 dark:text-white">
            Novo processo
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Pasta {folder.code} · {folder.title} · {folder.client.name}
          </p>
        </div>
        <ProcessForm folder={folder} />
      </div>
    </MainLayout>
  )
}
