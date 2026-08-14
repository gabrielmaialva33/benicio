import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FolderDetailContent } from '~/components/folders/folder_detail_content'
import { FolderStatusBadge } from '~/components/folders/folder_status_badge'
import type {
  FolderActivity,
  FolderDeadline,
  FolderDetailStats,
  FolderItem,
  FolderProcess,
} from '~/types/folder'

vi.mock('@inertiajs/react', () => ({
  Link: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const folder: FolderItem = {
  id: 10,
  code: 'CIV-2026-0010',
  title: 'Ação de cobrança contratual',
  description: 'Contexto jurídico real da pasta.',
  status: 'active',
  area: 'Cível',
  subarea: 'Contratos',
  client: {
    id: 2,
    name: 'Grupo Horizonte',
    document: '12345678000195',
    person_type: 'company',
    email: 'juridico@example.com',
  },
  responsible_lawyer: {
    id: 3,
    full_name: 'Maria Advocacia',
    email: 'maria@example.com',
  },
  created_at: '2026-08-10T10:00:00.000Z',
  updated_at: '2026-08-12T12:00:00.000Z',
}

const stats: FolderDetailStats = {
  processes_total: 1,
  tasks_open: 2,
  deadlines_open: 1,
  documents_total: 4,
}

const processes: FolderProcess[] = [
  {
    id: 20,
    cnj_number: null,
    legacy_number: null,
    internal_code: 'PROC-0010',
    status: 'active',
    instance: 'first',
    phase: 'knowledge',
    is_primary: true,
    nature: 'Cível',
    action_type: 'Cobrança',
    tribunal: 'TJSP',
    district: 'São Paulo',
    court_division: '10ª Vara Cível',
    judge: null,
    case_value: '25000.00',
    entry_date: '2026-08-10',
    created_at: '2026-08-10T10:00:00.000Z',
    parties: [
      {
        id: 1,
        side: 'active',
        role: 'Autor',
        is_primary: true,
        name: 'Grupo Horizonte',
        document: '12345678000195',
      },
    ],
  },
]

const deadlines: FolderDeadline[] = [
  {
    id: 30,
    title: 'Protocolar manifestação',
    kind: 'judicial',
    status: 'pending',
    priority: 'urgent',
    is_fatal: true,
    due_at: '2026-08-20T18:00:00.000Z',
    assignee_name: 'Maria Advocacia',
  },
]

const activities: FolderActivity[] = [
  {
    id: 40,
    event_type: 'process.created',
    summary: 'Processo cadastrado',
    occurred_at: '2026-08-10T10:00:00.000Z',
    actor_name: 'Maria Advocacia',
  },
]

describe('FolderDetailContent', () => {
  it('renders the real folder aggregate instead of legacy placeholders', () => {
    render(
      <FolderDetailContent
        folder={folder}
        stats={stats}
        processes={processes}
        deadlines={deadlines}
        activities={activities}
        successMessage="Pasta criada com sucesso."
      />
    )

    expect(screen.getByText(folder.code)).toBeInTheDocument()
    expect(screen.getByText(folder.title)).toBeInTheDocument()
    expect(screen.getByText(folder.description!)).toBeInTheDocument()
    expect(screen.getByText('PROC-0010')).toBeInTheDocument()
    expect(screen.getByText('Protocolar manifestação')).toBeInTheDocument()
    expect(screen.getByText('Processo cadastrado')).toBeInTheDocument()
    expect(screen.getByText('Pasta criada com sucesso.')).toBeInTheDocument()
  })

  it('shows honest empty states when the folder has no related records', () => {
    render(
      <FolderDetailContent
        folder={{ ...folder, description: null }}
        stats={{ processes_total: 0, tasks_open: 0, deadlines_open: 0, documents_total: 0 }}
        processes={[]}
        deadlines={[]}
        activities={[]}
      />
    )

    expect(screen.getByText('Nenhuma descrição registrada para esta pasta.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum processo vinculado a esta pasta.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum prazo em aberto.')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma atividade registrada.')).toBeInTheDocument()
  })

  it('translates every folder status', () => {
    const { rerender } = render(<FolderStatusBadge status="active" />)
    expect(screen.getByText('Ativa')).toBeInTheDocument()

    rerender(<FolderStatusBadge status="completed" />)
    expect(screen.getByText('Concluída')).toBeInTheDocument()

    rerender(<FolderStatusBadge status="pending" />)
    expect(screen.getByText('Pendente')).toBeInTheDocument()

    rerender(<FolderStatusBadge status="cancelled" />)
    expect(screen.getByText('Cancelada')).toBeInTheDocument()

    rerender(<FolderStatusBadge status="archived" />)
    expect(screen.getByText('Arquivada')).toBeInTheDocument()
  })
})
