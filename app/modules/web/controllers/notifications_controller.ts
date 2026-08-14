import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import NotificationService from '#modules/notifications/services/notification_service'
import NotificationsPageService from '#modules/web/services/notifications_page_service'
import { notificationsQueryValidator } from '#modules/web/validators/notifications_validator'
import { inertiaRedirectBack } from '#shared/http/inertia_redirect'
import { requireTenantId } from '#shared/http/tenant_context'

@inject()
export default class InertiaNotificationsController {
  constructor(
    private notificationsPageService: NotificationsPageService,
    private notificationService: NotificationService
  ) {}

  async index(ctx: HttpContext) {
    const { filter, type, page } = await notificationsQueryValidator.validate(ctx.request.qs())
    const data = await this.notificationsPageService.index(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id,
      filter ?? 'all',
      type,
      page ?? 1
    )

    return ctx.inertia.render('notifications/index', data)
  }

  async markRead(ctx: HttpContext) {
    await this.notificationService.markRead(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id,
      Number(ctx.params.id)
    )

    /**
     * Back rather than to a fixed URL: the reader keeps whichever filter and
     * page they were on, which is the whole point of marking one item read.
     */
    return inertiaRedirectBack(ctx)
  }

  async markAllRead(ctx: HttpContext) {
    const updated = await this.notificationService.markAllRead(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id
    )
    ctx.session.flash(
      'success',
      updated > 0
        ? `${updated} ${updated === 1 ? 'notificação marcada' : 'notificações marcadas'} como lida${updated === 1 ? '' : 's'}.`
        : 'Nenhuma notificação pendente.'
    )

    return inertiaRedirectBack(ctx)
  }
}
