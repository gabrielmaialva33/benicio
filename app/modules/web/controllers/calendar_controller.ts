import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { calendarQueryValidator } from '#modules/web/validators/calendar_validator'
import CalendarPageService from '#modules/web/services/calendar_page_service'
import { requireTenantId } from '#shared/http/tenant_context'

@inject()
export default class InertiaCalendarController {
  constructor(private agendaPageService: CalendarPageService) {}

  async index(ctx: HttpContext) {
    const { month, view } = await calendarQueryValidator.validate(ctx.request.qs())
    const page = await this.agendaPageService.index(requireTenantId(ctx), month, view ?? 'all')

    return ctx.inertia.render('agenda/index', page)
  }
}
