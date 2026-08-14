import '@testing-library/jest-dom/vitest'
import { server } from './mocks/server'
import { QueryClient } from '@tanstack/react-query'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'

/**
 * Permissões usadas como padrão nos testes de componente. O shell (sidebar e
 * header) esconde itens sem permissão, então sem isto todo teste de navegação
 * renderizaria vazio. Testes de restrição sobrescrevem `usePage` localmente.
 */
const permissoesPadraoDeTeste = [
  'dashboard.read',
  'folders.list',
  'folders.create',
  'ai.read',
  'clients.list',
  'users.list',
  'files.list',
  'roles.list',
  'permissions.list',
  'notifications.list',
  'messages.list',
]

// Mock InertiaJS
vi.mock('@inertiajs/react', () => ({
  usePage: vi.fn(() => ({
    props: {
      auth: {
        user: null,
        tenants: [],
        activeTenantId: null,
        permissions: permissoesPadraoDeTeste,
        roles: ['user'],
      },
    },
  })),
  Link: vi.fn(({ children }) => children),
  router: {
    visit: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

// Setup MSW
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Reset React Query client
afterEach(() => {
  queryClient.clear()
})

// Create a new QueryClient for each test
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { gcTime: Number.POSITIVE_INFINITY, retry: false },
  },
})
