import { Head } from '@inertiajs/react'

import { FolderForm } from '~/components/folders/folder_form'
import { MainLayout } from '~/layouts'
import type { FolderFormOptions } from '~/types/folder'

export default function CreateFolderPage(props: FolderFormOptions) {
  return (
    <MainLayout>
      <Head title="Nova pasta" />

      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-[-0.035em] text-slate-900 dark:text-white">
            Nova pasta
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Abra a pasta primeiro; processos judiciais serão vinculados dentro dela.
          </p>
        </div>
        <FolderForm {...props} />
      </div>
    </MainLayout>
  )
}
