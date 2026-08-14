import { Head } from '@inertiajs/react'

import { ClientForm } from '~/components/clients/client_form'
import { MainLayout } from '~/layouts'
import type { ClientItem } from '~/types/client'

export default function EditClientPage({ client }: { client: ClientItem }) {
  return (
    <MainLayout>
      <Head title={`Editar ${client.name}`} />
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-[-0.035em] text-slate-900 dark:text-white">
            Editar cliente
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Atualize os dados centrais sem perder os vínculos jurídicos.
          </p>
        </div>
        <ClientForm client={client} />
      </div>
    </MainLayout>
  )
}
