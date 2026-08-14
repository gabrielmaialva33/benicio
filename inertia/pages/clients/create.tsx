import { Head } from '@inertiajs/react'

import { ClientForm } from '~/components/clients/client_form'
import { MainLayout } from '~/layouts'

export default function CreateClientPage() {
  return (
    <MainLayout>
      <Head title="Novo cliente" />
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-[-0.035em] text-slate-900 dark:text-white">
            Novo cliente
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Cadastre a pessoa antes de abrir suas pastas jurídicas.
          </p>
        </div>
        <ClientForm />
      </div>
    </MainLayout>
  )
}
