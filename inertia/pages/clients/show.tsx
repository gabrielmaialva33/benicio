import { Head, usePage } from '@inertiajs/react'

import { ClientDetailContent } from '~/components/clients/client_detail_content'
import { MainLayout } from '~/layouts'
import type { ClientFolder, ClientItem } from '~/types/client'

interface ClientDetailPageProps {
  client: ClientItem
  folders: ClientFolder[]
}

interface SharedFlashProps {
  flash?: { success?: string | null; error?: string | null }
}

export default function ClientDetailPage(props: ClientDetailPageProps) {
  const { flash } = usePage().props as SharedFlashProps
  return (
    <MainLayout>
      <Head title={props.client.name} />
      <ClientDetailContent {...props} successMessage={flash?.success} errorMessage={flash?.error} />
    </MainLayout>
  )
}
