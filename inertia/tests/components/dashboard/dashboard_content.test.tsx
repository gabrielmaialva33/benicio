import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DashboardContent } from '~/components/dashboard/dashboard_content'
import { render } from '~/tests/test_utils'
import type { DashboardOverview } from '~/types/dashboard'

const dashboard: DashboardOverview = {
  generated_at: '2099-08-13T12:00:00.000Z',
  folders: {
    total: 18,
    active: 12,
    completed: 6,
    new_this_month: 3,
    by_status: [
      { status: 'active', count: 12, percentage: 66.67 },
      { status: 'completed', count: 6, percentage: 33.33 },
    ],
    by_area: [
      { area: 'Cível', count: 10, percentage: 55.56 },
      { area: 'Trabalhista', count: 8, percentage: 44.44 },
    ],
    monthly_evolution: [
      { month: '2099-07', count: 2 },
      { month: '2099-08', count: 3 },
    ],
  },
  tasks: {
    total: 5,
    pending: 2,
    completed_today: 1,
    overdue: 0,
    by_priority: [{ priority: 'urgent', count: 1 }],
  },
  hearings: { upcoming: 1, this_week: 1, this_month: 1 },
  deadlines: { open: 1, overdue: 0, due_this_week: 1, fatal_open: 1 },
  clients: { total: 9, active: 7, new_this_month: 2 },
  urgent_tasks: [
    {
      id: 1,
      title: 'Preparar defesa',
      status: 'pending',
      priority: 'urgent',
      due_date: '2099-08-14T15:00:00.000Z',
      folder_id: 1,
      process_id: 1,
      assignee_name: 'Ana Lima',
      folder_code: 'CIV-001',
    },
  ],
  upcoming_hearings: [
    {
      id: 1,
      process_id: 1,
      title: 'Audiência de conciliação',
      type: 'audience',
      status: 'scheduled',
      starts_at: '2099-08-15T13:00:00.000Z',
      ends_at: null,
      location: 'Fórum Central',
      online_url: null,
      folder_id: 1,
      folder_code: 'CIV-001',
    },
  ],
  upcoming_deadlines: [
    {
      id: 1,
      folder_id: 1,
      process_id: 1,
      title: 'Protocolar contestação',
      kind: 'judicial',
      status: 'pending',
      priority: 'urgent',
      is_fatal: true,
      due_at: '2099-08-16T18:00:00.000Z',
      folder_code: 'CIV-001',
      assignee_name: 'Ana Lima',
    },
  ],
  favorite_folders: [
    {
      id: 1,
      code: 'CIV-001',
      title: 'Ação indenizatória',
      status: 'active',
      area: 'Cível',
      client_name: 'Maria Souza',
      favorited_at: '2099-08-13T10:00:00.000Z',
    },
  ],
  recent_activity: [
    {
      id: 1,
      folder_id: 1,
      process_id: 1,
      actor_id: 1,
      event_type: 'document.created',
      summary: 'Petição inicial adicionada',
      data: {},
      occurred_at: '2099-08-13T11:00:00.000Z',
      actor_name: 'Ana Lima',
    },
  ],
}

describe('DashboardContent', () => {
  it('renders the approved legal dashboard with real overview data', () => {
    render(<DashboardContent dashboard={dashboard} />)

    expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    const activeFoldersCard = screen
      .getByRole('heading', { name: 'Pastas ativas' })
      .closest('section')
    expect(activeFoldersCard).not.toBeNull()
    expect(within(activeFoldersCard!).getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Preparar defesa')).toBeInTheDocument()
    expect(screen.getByText('Protocolar contestação')).toBeInTheDocument()
    expect(screen.getByText('Audiência de conciliação')).toBeInTheDocument()
    expect(screen.getByText(/CIV-001 · Ação indenizatória/)).toBeInTheDocument()
    expect(screen.getByText('Petição inicial adicionada')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })
})
