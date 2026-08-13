import type { HttpContext } from '@adonisjs/core/http'

import ForbiddenException from '#exceptions/forbidden_exception'

export function requireTenantId(ctx: HttpContext): number {
  if (!ctx.tenant) {
    throw new ForbiddenException('Tenant context is required')
  }

  return ctx.tenant.id
}
