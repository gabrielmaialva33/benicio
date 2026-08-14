import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

import BadRequestException from '#exceptions/bad_request_exception'
import SwitchTenantService from '#modules/tenants/services/switch_tenant_service'
import TenantMembershipService from '#modules/tenants/services/tenant_membership_service'

@inject()
export default class TenantsController {
  constructor(
    private tenantMembershipService: TenantMembershipService,
    private switchTenantService: SwitchTenantService
  ) {}

  /**
   * Lists the tenants the authenticated user belongs to, including the user's
   * role inside each tenant (from the `user_tenants` pivot).
   */
  async me({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    return response.ok({ data: await this.tenantMembershipService.list(user.id) })
  }

  /**
   * Switches the active tenant: validates membership and mints a fresh token
   * pair carrying the requested tenant as the active one.
   */
  async switch(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.getUserOrFail()
    const tenantIdInput: unknown = request.input('tenant_id')
    const tenantId = Number(tenantIdInput)

    if (!Number.isInteger(tenantId)) {
      throw new BadRequestException('tenant_id is required and must be an integer')
    }

    return response.ok(await this.switchTenantService.run(user.id, tenantId, ctx))
  }
}
