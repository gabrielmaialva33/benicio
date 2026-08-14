import { Head } from '@inertiajs/react'

import { ClientDetailContent } from '~/components/clients/client_detail_content'
import { useFlash } from '~/hooks/use_flash'
import { MainLayout } from '~/layouts'
import type { ClientFolder, ClientItem } from '~/types/client'

interface ClientDetailPageProps {
  client: ClientItem
  folders: ClientFolder[]
}

export default function ClientDetailPage(props: ClientDetailPageProps) {
  const flash = useFlash()
  return (
    <MainLayout>
      <Head title={props.client.name} />
      <ClientDetailContent {...props} successMessage={flash?.success} errorMessage={flash?.error} />
    </MainLayout>
  )
}
