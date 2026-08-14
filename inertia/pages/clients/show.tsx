import { Head } from '@inertiajs/react'

import { ClientDetailContent } from '~/components/clients/client_detail_content'
import { MainLayout } from '~/layouts'
import type { ClientFolder, ClientItem } from '~/types/client'

interface ClientDetailPageProps {
  client: ClientItem
  folders: ClientFolder[]
}

export default function ClientDetailPage(props: ClientDetailPageProps) {
  return (
    <MainLayout>
      <Head title={props.client.name} />
      <ClientDetailContent {...props} />
    </MainLayout>
  )
}
