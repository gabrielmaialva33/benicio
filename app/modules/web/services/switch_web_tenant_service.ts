import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import ForbiddenException from '#exceptions/forbidden_exception'
import JwtAuthTokensService from '#modules/auth/services/jwt_auth_tokens_service'
import TenantMembershipService from '#modules/tenants/services/tenant_membership_service'

@inject()
export default class SwitchWebTenantService {
  constructor(
    private tenantMembershipService: TenantMembershipService,
    private jwtAuthTokensService: JwtAuthTokensService
  ) {}

  async run(ctx: HttpContext, userId: number, tenantId: number): Promise<void> {
    const tenant = await this.tenantMembershipService.findActive(userId, tenantId)
    if (!tenant) throw new ForbiddenException('You do not belong to this tenant')

    await this.jwtAuthTokensService.setTenantAccessCookie(ctx, userId, tenant.id)
  }
}
