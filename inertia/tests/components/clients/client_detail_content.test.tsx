import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ClientDetailContent } from '~/components/clients/client_detail_content'
import type { ClientFolder, ClientItem } from '~/types/client'

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
  router: { delete: vi.fn() },
}))

const client: ClientItem = {
  id: 12,
  name: 'Grupo Horizonte',
  document: '12345678000195',
  person_type: 'company',
  email: 'juridico@horizonte.example',
  phone: '+55 11 99999-0000',
  address: {
    street: 'Avenida Paulista',
    number: '1000',
    complement: null,
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    postal_code: '01310-100',
    country: 'BR',
  },
  notes: 'Contato preferencial por e-mail.',
  folders_total: 1,
  active_folders: 1,
  created_at: '2026-08-10T10:00:00.000Z',
  updated_at: '2026-08-12T12:00:00.000Z',
}

const folders: ClientFolder[] = [
  {
    id: 42,
    code: 'CIV-2026-0042',
    title: 'Ação de cobrança contratual',
    status: 'active',
    area: 'Cível',
    subarea: 'Contratos',
    created_at: '2026-08-10T10:00:00.000Z',
  },
]

describe('ClientDetailContent', () => {
  it('renders the persisted client aggregate and its navigation', () => {
    render(<ClientDetailContent client={client} folders={folders} />)

    expect(screen.getByText(client.name)).toBeInTheDocument()
    expect(screen.getByText('12.345.678/0001-95')).toBeInTheDocument()
    expect(screen.getByText(client.email!)).toBeInTheDocument()
    expect(screen.getByText(client.phone!)).toBeInTheDocument()
    expect(screen.getByText(client.notes!)).toBeInTheDocument()
    expect(screen.getByText(folders[0].code)).toBeInTheDocument()
    expect(screen.getByText(folders[0].title)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute(
      'href',
      `/clients/${client.id}/edit`
    )
    expect(screen.getByRole('link', { name: 'Nova pasta' })).toHaveAttribute(
      'href',
      `/folders/create?client_id=${client.id}`
    )
  })

  it('shows honest fallbacks when optional client data is absent', () => {
    render(
      <ClientDetailContent
        client={{
          ...client,
          email: null,
          phone: null,
          address: null,
          notes: null,
          folders_total: 0,
          active_folders: 0,
        }}
        folders={[]}
      />
    )

    expect(screen.getAllByText('Não informado')).toHaveLength(2)
    expect(screen.getByText('Nenhum endereço informado.')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma observação interna.')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma pasta vinculada.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir primeira pasta' })).toHaveAttribute(
      'href',
      `/folders/create?client_id=${client.id}`
    )
  })
})
