import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import BadRequestException from '#exceptions/bad_request_exception'
import SwitchWebTenantService from '#modules/web/services/switch_web_tenant_service'
import { inertiaRedirectBack } from '#shared/http/inertia_redirect'

/**
 * Inertia (web) tenant controller.
 *
 * Handles switching the active tenant for a browser session. The JWT guard
 * stores its access token in the `token` httpOnly cookie. Switching re-mints
 * that token with the selected `tenantId`, while preserving its session family
 * when one exists.
 *
 * Token issuance stays in the auth service; this controller only validates the
 * boundary input and delegates the tenant membership decision.
 */
@inject()
export default class InertiaTenantController {
  constructor(private switchWebTenantService: SwitchWebTenantService) {}

  async switch(ctx: HttpContext) {
    const { auth, request } = ctx

    const tenantIdInput: unknown = request.input('tenant_id')
    const tenantId = Number(tenantIdInput)

    if (!Number.isInteger(tenantId)) {
      throw new BadRequestException('tenant_id is required and must be an integer')
    }

    await this.switchWebTenantService.run(ctx, auth.getUserOrFail().id, tenantId)

    return inertiaRedirectBack(ctx)
  }
}
