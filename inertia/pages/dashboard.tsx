import { Head } from '@inertiajs/react'

import { DashboardContent } from '~/components/dashboard/dashboard_content'
import { MainLayout } from '~/layouts'
import type { DashboardOverview } from '~/types/dashboard'

interface DashboardPageProps {
  dashboard: DashboardOverview
}

export default function DashboardPage({ dashboard }: DashboardPageProps) {
  return (
    <MainLayout>
      <Head title="Visão Geral" />
      <DashboardContent dashboard={dashboard} />
    </MainLayout>
  )
}
