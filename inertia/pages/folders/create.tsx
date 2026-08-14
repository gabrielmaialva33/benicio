import { Head } from '@inertiajs/react'

import { FolderForm } from '~/components/folders/folder_form'
import { MainLayout } from '~/layouts'
import type { FolderFormOptions } from '~/types/folder'

export default function CreateFolderPage(props: FolderFormOptions) {
  return (
    <MainLayout>
      <Head title="Nova pasta" />

      <div className="space-y-8">
        <FolderForm {...props} />
      </div>
    </MainLayout>
  )
}
