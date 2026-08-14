/**
 * Inertia page registry.
 *
 * Inertia v4 types `inertia.render(page, props)` against this interface. Each
 * key is a page component (relative to `inertia/pages`) and the value describes
 * the props passed from the controller. Pages without page-specific props use
 * an empty object.
 */
import type { DashboardOverview } from '#modules/dashboard/interfaces/dashboard_interface'
import type {
  WebFolder,
  WebFolderActivity,
  WebFolderDeadline,
  WebFolderDetailStats,
  WebFolderFilters,
  WebFolderFormOptions,
  WebFolderProcess,
  WebFolderStatusCount,
  WebPaginationMeta,
} from '#modules/web/interfaces/folder_page_interface'
import type { WebRole } from '#modules/web/services/list_roles_with_permissions_service'
import type { WebPermission } from '#modules/web/services/list_all_permissions_service'

type SettingsProfile = {
  id: number
  full_name: string
  email: string
  username: string | null
}

declare module '@adonisjs/inertia/types' {
  interface InertiaPages {
    // Auth
    'auth/login': Record<string, never>
    'auth/register': Record<string, never>

    // Root / misc
    'home': Record<string, never>
    'ui_demo': Record<string, never>
    'data_grid_demo': Record<string, never>
    'dashboard': { dashboard: DashboardOverview }

    // Folders
    'folders/index': {
      folders: { data: WebFolder[]; meta: WebPaginationMeta }
      filters: WebFolderFilters
      areas: string[]
      status_counts: WebFolderStatusCount[]
      total_count: number
    }
    'folders/create': WebFolderFormOptions
    'folders/show': {
      folder: WebFolder
      stats: WebFolderDetailStats
      processes: WebFolderProcess[]
      deadlines: WebFolderDeadline[]
      activities: WebFolderActivity[]
    }

    // Files
    'files/index': Record<string, never>

    // Roles
    'roles/index': { roles: WebRole[] }

    // Permissions
    'permissions/index': { permissions: WebPermission[] }

    // Settings
    'settings/index': { profile: SettingsProfile }

    // Users
    'users/index': {
      users: Record<string, any>
      search: string
      sortBy: string
      direction: string
    }
    'users/create': Record<string, never>
    'users/edit': {
      user: Record<string, any> | null
    }

    // Error pages
    'errors/not_found': {
      error: Record<string, any>
    }
    'errors/server_error': {
      error: Record<string, any>
    }
  }
}
