import '@testing-library/jest-dom/vitest'
import { server } from './mocks/server'
import { QueryClient } from '@tanstack/react-query'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'

/**
 * Default permissions for component tests. The shell (sidebar and header) hides
 * items the user cannot reach, so without these every navigation test would
 * render empty. Restriction tests override `usePage` locally.
 */
const DEFAULT_TEST_PERMISSIONS = [
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
        permissions: DEFAULT_TEST_PERMISSIONS,
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
