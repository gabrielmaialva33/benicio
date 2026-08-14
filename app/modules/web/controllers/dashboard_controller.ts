import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import DashboardService from '#modules/dashboard/services/dashboard_service'
import { requireTenantId } from '#shared/http/tenant_context'

export default class InertiaDashboardController {
  async index(ctx: HttpContext) {
    const dashboardService = await app.container.make(DashboardService)
    const dashboard = await dashboardService.overview(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id
    )

    return ctx.inertia.render('dashboard', { dashboard })
  }
}
