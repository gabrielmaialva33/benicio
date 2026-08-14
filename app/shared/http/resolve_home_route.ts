import app from '@adonisjs/core/services/app'

import PermissionService from '#modules/permissions/services/permission_service'

/**
 * Home candidates, from the broadest to the most restricted. The first one the
 * user holds the permission for becomes their default landing route.
 */
const HOME_ROUTES_BY_PERMISSION = [
  { route: '/dashboard', permission: 'dashboard.read' },
  { route: '/folders', permission: 'folders.list' },
  { route: '/clients', permission: 'clients.list' },
] as const

/** Route any authenticated user can reach (own profile + workspaces). */
const FALLBACK_ROUTE = '/settings'

/**
 * Resolves where to send the user after sign-in (and in place of a 403).
 *
 * Without this, restricted profiles such as the client/guest always land on
 * `/dashboard`, take a 403 and get stuck in a loop, since `/login` bounces the
 * authenticated user right back to `/dashboard`.
 */
export async function resolveHomeRoute(userId: number): Promise<string> {
  const permissionService = await app.container.make(PermissionService)

  for (const candidate of HOME_ROUTES_BY_PERMISSION) {
    const hasPermission = await permissionService.checkUserPermission({
      user_id: userId,
      permission: candidate.permission,
    })

    if (hasPermission) return candidate.route
  }

  return FALLBACK_ROUTE
}
