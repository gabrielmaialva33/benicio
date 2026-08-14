import { Head } from '@inertiajs/react'

import { ClientForm } from '~/components/clients/client_form'
import { MainLayout } from '~/layouts'
import type { ClientItem } from '~/types/client'

export default function EditClientPage({ client }: { client: ClientItem }) {
  return (
    <MainLayout>
      <Head title={`Editar ${client.name}`} />
      <div className="w-full">
        <ClientForm client={client} />
      </div>
    </MainLayout>
  )
}
