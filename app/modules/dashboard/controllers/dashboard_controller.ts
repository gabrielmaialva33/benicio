import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import { requireTenantId } from '#shared/http/tenant_context'
import DashboardService from '#modules/dashboard/services/dashboard_service'
import { dashboardWidgetValidator } from '#modules/dashboard/validators/dashboard_validators'

export default class DashboardController {
  async show(ctx: HttpContext) {
    const service = await app.container.make(DashboardService)
    const data = await service.overview(requireTenantId(ctx), ctx.auth.getUserOrFail().id)
    return ctx.response.ok({ data })
  }

  async stats(ctx: HttpContext) {
    const service = await app.container.make(DashboardService)
    return ctx.response.ok({ data: await service.summary(requireTenantId(ctx)) })
  }

  async urgentTasks(ctx: HttpContext) {
    const { limit = 10 } = await dashboardWidgetValidator.validate(ctx.request.qs())
    const service = await app.container.make(DashboardService)
    return ctx.response.ok({ data: await service.urgentTasks(requireTenantId(ctx), limit) })
  }

  async upcomingHearings(ctx: HttpContext) {
    const { limit = 10 } = await dashboardWidgetValidator.validate(ctx.request.qs())
    const service = await app.container.make(DashboardService)
    return ctx.response.ok({ data: await service.upcomingHearings(requireTenantId(ctx), limit) })
  }

  async upcomingDeadlines(ctx: HttpContext) {
    const { limit = 10 } = await dashboardWidgetValidator.validate(ctx.request.qs())
    const service = await app.container.make(DashboardService)
    return ctx.response.ok({ data: await service.upcomingDeadlines(requireTenantId(ctx), limit) })
  }

  async favoriteFolders(ctx: HttpContext) {
    const { limit = 10 } = await dashboardWidgetValidator.validate(ctx.request.qs())
    const service = await app.container.make(DashboardService)
    const data = await service.favoriteFolders(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id,
      limit
    )
    return ctx.response.ok({ data })
  }

  async recentActivity(ctx: HttpContext) {
    const { limit = 10 } = await dashboardWidgetValidator.validate(ctx.request.qs())
    const service = await app.container.make(DashboardService)
    return ctx.response.ok({ data: await service.recentActivity(requireTenantId(ctx), limit) })
  }
}
