import { usePage } from '@inertiajs/react'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SidebarNav } from '~/layouts/main/components/sidebar'
import { render } from '~/tests/test_utils'

vi.mock('~/hooks/use_shell_data', () => ({
  useFavoriteFolders: () => ({
    data: [
      { id: 1, code: 'CIV-001', title: 'Ação indenizatória', area: 'Cível' },
      { id: 2, code: 'TRA-002', title: 'Reclamação trabalhista', area: 'Trabalhista' },
      { id: 3, code: 'TRI-003', title: 'Execução fiscal', area: 'Tributário' },
      { id: 4, code: 'ADM-004', title: 'Processo administrativo', area: 'Administrativo' },
    ],
    isPending: false,
    isError: false,
  }),
}))

describe('SidebarNav', () => {
  beforeEach(() => {
    vi.mocked(usePage).mockReturnValue({ url: '/dashboard', props: {} } as ReturnType<
      typeof usePage
    >)
  })

  it('restores the favorite-folder navigation from the legacy shell', async () => {
    const { user } = render(<SidebarNav />)

    expect(screen.getByText('CIV-001')).toBeInTheDocument()
    expect(screen.queryByText('ADM-004')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mostrar mais' }))
    expect(screen.getByText('ADM-004')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Filtrar navegação' }), 'fiscal')
    expect(screen.getByText('TRI-003')).toBeInTheDocument()
    expect(screen.queryByText('CIV-001')).not.toBeInTheDocument()
  })
})
