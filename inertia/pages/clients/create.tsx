import { Head } from '@inertiajs/react'

import { ClientForm } from '~/components/clients/client_form'
import { MainLayout } from '~/layouts'

export default function CreateClientPage() {
  return (
    <MainLayout>
      <Head title="Novo cliente" />
      <div className="w-full">
        <ClientForm />
      </div>
    </MainLayout>
  )
}
