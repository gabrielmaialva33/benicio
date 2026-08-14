import { usePage } from '@inertiajs/react'
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMenu, usePageCopy } from '~/hooks/use_menu'

function mockPage(url: string, permissions: string[]) {
  vi.mocked(usePage).mockReturnValue({
    url,
    flash: {},
    props: {
      auth: { user: null, tenants: [], activeTenantId: null, permissions, roles: ['user'] },
    },
  } as unknown as ReturnType<typeof usePage>)
}

describe('useMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('drops the entries the user has no permission to reach', () => {
    mockPage('/dashboard', ['dashboard.read'])

    const { result } = renderHook(() => useMenu())

    expect(result.current.sections[0].items.map((item) => item.title)).toEqual(['Visão Geral'])
    // "Configurações" carries no permission, so its section survives with just it.
    expect(result.current.sections[1].items.map((item) => item.title)).toEqual(['Configurações'])
  })

  it('filters submenu children by their own permission', () => {
    mockPage('/folders', ['folders.list'])

    const { result } = renderHook(() => useMenu())
    const folders = result.current.sections[0].items.find((item) => item.href === '/folders')

    // "Cadastrar" needs folders.create, which this user does not hold.
    expect(folders?.children?.map((child) => child.title)).toEqual(['Consulta'])
  })

  it('matches nested routes but not sibling prefixes', () => {
    mockPage('/folders/12/processes/3', ['folders.list'])

    const { result } = renderHook(() => useMenu())

    expect(result.current.isActive('/folders')).toBe(true)
    expect(result.current.isActive('/folder')).toBe(false)
  })

  it('exposes a flat destination list for the command palette', () => {
    mockPage('/dashboard', ['dashboard.read', 'clients.list'])

    const { result } = renderHook(() => useMenu())

    expect(result.current.destinations.map((item) => item.href)).toContain('/clients')
  })
})

describe('usePageCopy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefers the most specific rule', () => {
    mockPage('/folders/create', ['folders.list'])
    expect(renderHook(() => usePageCopy()).result.current.title).toBe('Cadastro de Pasta')

    mockPage('/folders/42', ['folders.list'])
    expect(renderHook(() => usePageCopy()).result.current.title).toBe('Detalhes da Pasta')

    mockPage('/folders', ['folders.list'])
    expect(renderHook(() => usePageCopy()).result.current.title).toBe('Consulta de pastas')
  })

  it('builds a breadcrumb trail for nested routes', () => {
    mockPage('/folders/42/processes/7', ['folders.list'])

    const { result } = renderHook(() => usePageCopy())

    expect(result.current.breadcrumb).toEqual([{ label: 'Pastas', href: '/folders' }])
    expect(result.current.title).toBe('Detalhes do Processo')
  })

  it('falls back instead of rendering an empty header', () => {
    mockPage('/rota-inexistente', [])

    expect(renderHook(() => usePageCopy()).result.current.title).toBe('Benício')
  })

  it('ignores the query string', () => {
    mockPage('/clients?page=2&search=acme', ['clients.list'])

    expect(renderHook(() => usePageCopy()).result.current.title).toBe('Clientes')
  })
})
