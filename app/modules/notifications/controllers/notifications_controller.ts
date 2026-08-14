import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import { requireTenantId } from '#shared/http/tenant_context'
import NotificationService from '#modules/notifications/services/notification_service'
import {
  createNotificationValidator,
  listNotificationsValidator,
  notificationRecentValidator,
} from '#modules/notifications/validators/notification_validators'

export default class NotificationsController {
  async index(ctx: HttpContext) {
    const input = await listNotificationsValidator.validate(ctx.request.qs())
    const service = await app.container.make(NotificationService)
    return ctx.response.ok(
      await service.list(requireTenantId(ctx), ctx.auth.getUserOrFail().id, input)
    )
  }

  async recent(ctx: HttpContext) {
    const { limit = 10 } = await notificationRecentValidator.validate(ctx.request.qs())
    const service = await app.container.make(NotificationService)
    const data = await service.recent(requireTenantId(ctx), ctx.auth.getUserOrFail().id, limit)
    return ctx.response.ok({ data })
  }

  async unreadCount(ctx: HttpContext) {
    const service = await app.container.make(NotificationService)
    const count = await service.unreadCount(requireTenantId(ctx), ctx.auth.getUserOrFail().id)
    return ctx.response.ok({ data: { count } })
  }

  async show(ctx: HttpContext) {
    const service = await app.container.make(NotificationService)
    const data = await service.get(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id,
      Number(ctx.params.id)
    )
    return ctx.response.ok({ data })
  }

  async store(ctx: HttpContext) {
    const input = await createNotificationValidator.validate(ctx.request.all())
    const service = await app.container.make(NotificationService)
    const data = await service.create(requireTenantId(ctx), ctx.auth.getUserOrFail().id, input)
    return ctx.response.created({ data })
  }

  async markRead(ctx: HttpContext) {
    const service = await app.container.make(NotificationService)
    const data = await service.markRead(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id,
      Number(ctx.params.id)
    )
    return ctx.response.ok({ data })
  }

  async markAllRead(ctx: HttpContext) {
    const service = await app.container.make(NotificationService)
    const updated = await service.markAllRead(requireTenantId(ctx), ctx.auth.getUserOrFail().id)
    return ctx.response.ok({ data: { updated } })
  }

  async destroy(ctx: HttpContext) {
    const service = await app.container.make(NotificationService)
    await service.delete(requireTenantId(ctx), ctx.auth.getUserOrFail().id, Number(ctx.params.id))
    return ctx.response.noContent()
  }
}
