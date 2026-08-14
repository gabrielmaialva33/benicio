import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ProcessDetailContent } from '~/components/processes/process_detail_content'
import { ProcessStatusBadge } from '~/components/processes/process_status_badge'
import type { ProcessFolder, ProcessItem } from '~/types/process'

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
  router: { delete: vi.fn(), put: vi.fn() },
}))

const folder: ProcessFolder = {
  id: 10,
  code: 'CIV-2026-0010',
  title: 'Ação de cobrança contratual',
  area: 'Cível',
  client: { id: 20, name: 'Grupo Horizonte' },
}

const process: ProcessItem = {
  id: 30,
  folder_id: folder.id,
  cnj_number: '51445060520268090112',
  legacy_number: null,
  internal_code: 'PROC-0010',
  status: 'active',
  instance: 'first',
  phase: 'knowledge',
  distribution_type: 'lottery',
  electronic: true,
  is_primary: true,
  nature: 'Cível',
  action_type: 'Ação de cobrança',
  tribunal: 'TJSP',
  judicial_body: 'Tribunal de Justiça',
  district: 'São Paulo',
  forum: 'Foro Central',
  court_division: '10ª Vara Cível',
  judge: 'Maria da Silva',
  case_value: '25000.50',
  conviction_value: null,
  costs: '150.00',
  fees: null,
  distribution_date: '2026-08-10',
  citation_date: null,
  entry_date: '2026-08-11',
  observation: 'Aguardar contestação.',
  object_detail: 'Cobrança de parcelas contratuais.',
  created_at: '2026-08-10T10:00:00.000Z',
  updated_at: '2026-08-12T12:00:00.000Z',
  parties: [
    {
      id: 1,
      side: 'active',
      role: 'Autora',
      is_primary: true,
      name: 'Grupo Horizonte',
      document: '12345678000195',
      person_type: 'company',
    },
  ],
}

describe('ProcessDetailContent', () => {
  it('renders the complete persisted process aggregate', () => {
    render(
      <ProcessDetailContent folder={folder} process={process} />
    )

    expect(screen.getByRole('heading', { name: '5144506-05.2026.8.09.0112' })).toBeInTheDocument()
    expect(screen.getByText(process.internal_code!)).toBeInTheDocument()
    expect(screen.getByText(process.action_type!)).toBeInTheDocument()
    expect(screen.getByText(process.court_division!)).toBeInTheDocument()
    expect(screen.getByText(/25\.000,50/)).toBeInTheDocument()
    expect(screen.getAllByText(process.parties[0].name)).toHaveLength(2)
    expect(screen.getByText(process.observation!)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute(
      'href',
      `/folders/${folder.id}/processes/${process.id}/edit`
    )
    expect(screen.getByRole('link', { name: new RegExp(folder.code) })).toHaveAttribute(
      'href',
      `/folders/${folder.id}`
    )
  })

  it('shows explicit fallbacks when optional process data is absent', () => {
    render(
      <ProcessDetailContent
        folder={folder}
        process={{
          ...process,
          cnj_number: null,
          internal_code: 'PROC-EMPTY',
          instance: null,
          phase: null,
          distribution_type: null,
          electronic: null,
          tribunal: null,
          judicial_body: null,
          district: null,
          forum: null,
          court_division: null,
          judge: null,
          case_value: null,
          costs: null,
          distribution_date: null,
          entry_date: null,
          observation: null,
          object_detail: null,
          is_primary: false,
          parties: [],
        }}
      />
    )

    expect(screen.getByRole('heading', { name: 'PROC-EMPTY' })).toBeInTheDocument()
    expect(screen.getByText('Nenhuma parte cadastrada para este processo.')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma observação registrada.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum detalhamento registrado.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tornar principal' })).toBeInTheDocument()
  })

  it('translates every process status', () => {
    const { rerender } = render(<ProcessStatusBadge status="active" />)
    expect(screen.getByText('Ativo')).toBeInTheDocument()

    rerender(<ProcessStatusBadge status="suspended" />)
    expect(screen.getByText('Suspenso')).toBeInTheDocument()

    rerender(<ProcessStatusBadge status="archived" />)
    expect(screen.getByText('Arquivado')).toBeInTheDocument()

    rerender(<ProcessStatusBadge status="closed" />)
    expect(screen.getByText('Encerrado')).toBeInTheDocument()
  })
})
