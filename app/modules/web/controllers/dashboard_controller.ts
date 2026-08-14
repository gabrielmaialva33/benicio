import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import DashboardService from '#modules/dashboard/services/dashboard_service'
import { requireTenantId } from '#shared/http/tenant_context'

@inject()
export default class InertiaDashboardController {
  constructor(private dashboardService: DashboardService) {}

  async index(ctx: HttpContext) {
    const dashboard = await this.dashboardService.overview(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id
    )

    return ctx.inertia.render('dashboard', { dashboard })
  }
}
