import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import type { NextFn } from '@adonisjs/core/types/http'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'
import jwt from 'jsonwebtoken'

import PermissionService from '#modules/permissions/services/permission_service'
import TenantMembershipService from '#modules/tenants/services/tenant_membership_service'

type SharedUser = {
  id: number
  full_name: string
  email: string
}

type SharedTenant = {
  id: number
  name: string
  slug: string
  is_active: boolean
  role: string | null
}

/**
 * Concrete Inertia middleware.
 *
 * In Inertia v4 the framework ships an abstract `BaseInertiaMiddleware`, so the
 * host application must provide a concrete subclass that wires up the request
 * lifecycle and (optionally) shares data with every page.
 *
 * Beyond validation errors and flash messages, this shares the authenticated
 * user, the tenants the user belongs to (with their pivot role) and the active
 * tenant id, so the React layout (header/sidebar/tenant switcher) can read them
 * straight from `usePage().props`.
 */
@inject()
export default class InertiaMiddleware extends BaseInertiaMiddleware {
  constructor(private tenantMembershipService: TenantMembershipService) {
    super()
  }

  async share(ctx: HttpContext) {
    const auth = await this.#resolveAuth(ctx)

    return {
      errors: this.getValidationErrors(ctx),
      auth,
    }
  }

  /**
   * Inertia v3 transports ephemeral messages outside page props. Keeping them
   * in the first-class flash bag prevents partial and background visits from
   * preserving a stale value or clearing a fresh one.
   */
  flash(ctx: HttpContext) {
    const messages = ctx.session?.flashMessages

    return {
      ...(messages?.has('success') ? { success: messages.get('success') } : {}),
      ...(messages?.has('error') ? { error: messages.get('error') } : {}),
      ...(messages?.has('warning') ? { warning: messages.get('warning') } : {}),
      ...(messages?.has('info') ? { info: messages.get('info') } : {}),
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)
    const result = await next()
    this.dispose(ctx)
    return result
  }

  /**
   * Silently authenticates the request (does not throw) and, when a user is
   * present, loads the tenants they belong to plus the active tenant id.
   */
  async #resolveAuth(ctx: HttpContext): Promise<{
    user: SharedUser | null
    tenants: SharedTenant[]
    activeTenantId: number | null
    permissions: string[]
    roles: string[]
  }> {
    const empty = {
      user: null,
      tenants: [] as SharedTenant[],
      activeTenantId: null,
      permissions: [] as string[],
      roles: [] as string[],
    }

    if (!ctx.auth) {
      return empty
    }

    const isAuthenticated = await ctx.auth.use('jwt').check()
    const user = ctx.auth.user
    if (!isAuthenticated || !user) {
      return empty
    }

    const tenants: SharedTenant[] = await this.tenantMembershipService.list(user.id)

    const activeTenantId = this.#resolveActiveTenantId(ctx, tenants)

    const permissionService = await app.container.make(PermissionService)
    const permissionSummary = await permissionService.getUserPermissionSummary(user.id)

    return {
      user: { id: user.id, full_name: user.full_name, email: user.email },
      tenants,
      activeTenantId,
      permissions: permissionSummary.effectivePermissions.map(
        (permission) => `${permission.resource}.${permission.action}`
      ),
      roles: permissionSummary.roles,
    }
  }

  /**
   * Reads the active tenant from the JWT `tenantId` claim (token cookie),
   * falling back to the first tenant the user belongs to.
   */
  #resolveActiveTenantId(ctx: HttpContext, tenants: SharedTenant[]): number | null {
    const cookieToken = ctx.request.cookie('token')
    if (typeof cookieToken === 'string') {
      const payload: unknown = jwt.decode(cookieToken)
      if (
        payload &&
        typeof payload === 'object' &&
        'tenantId' in payload &&
        typeof (payload as { tenantId: unknown }).tenantId === 'number'
      ) {
        const claimed = (payload as { tenantId: number }).tenantId
        if (tenants.some((tenant) => tenant.id === claimed)) {
          return claimed
        }
      }
    }

    return tenants[0]?.id ?? null
  }
}
