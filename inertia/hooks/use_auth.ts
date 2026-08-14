import { usePage } from '@inertiajs/react'
import type { AuthSharedProps } from '~/types'

export function useAuth() {
  const { auth } = usePage().props as { auth?: AuthSharedProps }

  const tenants = auth?.tenants ?? []
  const activeTenantId = auth?.activeTenantId ?? null
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId) ?? tenants[0] ?? null

  const permissions = auth?.permissions ?? []
  const roles = auth?.roles ?? []

  /** `true` when the user holds the given `resource.action` permission. */
  const can = (requiredPermission: string) => permissions.includes(requiredPermission)

  return {
    user: auth?.user ?? null,
    isAuthenticated: !!auth?.user,
    tenants,
    activeTenant,
    activeTenantId,
    permissions,
    roles,
    can,
  }
}
