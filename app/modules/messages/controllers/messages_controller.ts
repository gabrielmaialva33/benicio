import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import { requireTenantId } from '#shared/http/tenant_context'
import MessageService from '#modules/messages/services/message_service'
import {
  createMessageValidator,
  listMessagesValidator,
  messageRecentValidator,
} from '#modules/messages/validators/message_validators'

export default class MessagesController {
  async index(ctx: HttpContext) {
    const input = await listMessagesValidator.validate(ctx.request.qs())
    const service = await app.container.make(MessageService)
    return ctx.response.ok(
      await service.list(requireTenantId(ctx), ctx.auth.getUserOrFail().id, input)
    )
  }

  async recent(ctx: HttpContext) {
    const { limit = 10 } = await messageRecentValidator.validate(ctx.request.qs())
    const service = await app.container.make(MessageService)
    const data = await service.recent(requireTenantId(ctx), ctx.auth.getUserOrFail().id, limit)
    return ctx.response.ok({ data })
  }

  async unreadCount(ctx: HttpContext) {
    const service = await app.container.make(MessageService)
    const count = await service.unreadCount(requireTenantId(ctx), ctx.auth.getUserOrFail().id)
    return ctx.response.ok({ data: { count } })
  }

  async show(ctx: HttpContext) {
    const service = await app.container.make(MessageService)
    const data = await service.get(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id,
      Number(ctx.params.id)
    )
    return ctx.response.ok({ data })
  }

  async store(ctx: HttpContext) {
    const input = await createMessageValidator.validate(ctx.request.all())
    const service = await app.container.make(MessageService)
    const data = await service.create(requireTenantId(ctx), ctx.auth.getUserOrFail().id, input)
    return ctx.response.created({ data })
  }

  async markRead(ctx: HttpContext) {
    const service = await app.container.make(MessageService)
    const data = await service.markRead(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id,
      Number(ctx.params.id)
    )
    return ctx.response.ok({ data })
  }

  async markAllRead(ctx: HttpContext) {
    const service = await app.container.make(MessageService)
    const updated = await service.markAllRead(requireTenantId(ctx), ctx.auth.getUserOrFail().id)
    return ctx.response.ok({ data: { updated } })
  }

  async destroy(ctx: HttpContext) {
    const service = await app.container.make(MessageService)
    await service.delete(requireTenantId(ctx), ctx.auth.getUserOrFail().id, Number(ctx.params.id))
    return ctx.response.noContent()
  }
}
