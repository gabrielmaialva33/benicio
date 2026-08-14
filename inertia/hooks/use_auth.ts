import { usePage } from '@inertiajs/react'
import { useCallback, useMemo } from 'react'

import type { AppSharedProps } from '~/types'

export function useAuth() {
  const { auth } = usePage<AppSharedProps>().props

  const tenants = auth?.tenants ?? []
  const activeTenantId = auth?.activeTenantId ?? null
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId) ?? tenants[0] ?? null

  const permissions = auth?.permissions ?? []
  const roles = auth?.roles ?? []

  /*
   * The sidebar and the command palette check dozens of permissions on every
   * render, so the lookup is a Set rather than a linear scan over the array.
   */
  const permissionSet = useMemo(() => new Set(permissions), [permissions])

  /** `true` when the user holds the given `resource.action` permission. */
  const can = useCallback(
    (requiredPermission: string) => permissionSet.has(requiredPermission),
    [permissionSet]
  )

  /** `true` when the user holds at least one of the given permissions. */
  const canAny = useCallback(
    (requiredPermissions: string[]) =>
      requiredPermissions.some((permission) => permissionSet.has(permission)),
    [permissionSet]
  )

  return {
    user: auth?.user ?? null,
    isAuthenticated: !!auth?.user,
    tenants,
    activeTenant,
    activeTenantId,
    permissions,
    roles,
    can,
    canAny,
  }
}
