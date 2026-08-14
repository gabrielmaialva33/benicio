import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import ForbiddenException from '#exceptions/forbidden_exception'
import JwtAuthTokensService from '#modules/auth/services/jwt_auth_tokens_service'
import TenantMembershipService from '#modules/tenants/services/tenant_membership_service'

@inject()
export default class SwitchTenantService {
  constructor(
    private tenantMembershipService: TenantMembershipService,
    private jwtAuthTokensService: JwtAuthTokensService
  ) {}

  async run(userId: number, tenantId: number, ctx: HttpContext) {
    const tenant = await this.tenantMembershipService.findActive(userId, tenantId)
    if (!tenant) throw new ForbiddenException('You do not belong to this tenant')

    const auth = await this.jwtAuthTokensService.run({ userId, tenantId }, ctx)
    return { tenant, auth }
  }
}
