import { Readable } from 'node:stream'

import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import { requireTenantId } from '#shared/http/tenant_context'
import AiChatService from '#modules/ai/services/ai_chat_service'
import { aiChatValidator, aiConversationListValidator } from '#modules/ai/validators/ai_validators'

export default class AiChatController {
  async chat(ctx: HttpContext) {
    const input = await aiChatValidator.validate(ctx.request.all())
    const service = await app.container.make(AiChatService)
    return ctx.response.ok(
      await service.chat(requireTenantId(ctx), ctx.auth.getUserOrFail().id, input)
    )
  }

  async stream(ctx: HttpContext) {
    const input = await aiChatValidator.validate(ctx.request.all())
    const service = await app.container.make(AiChatService)
    service.ensureAvailable()
    const output = service.stream(requireTenantId(ctx), ctx.auth.getUserOrFail().id, input)

    ctx.response.header('Content-Type', 'text/event-stream; charset=utf-8')
    ctx.response.header('Cache-Control', 'no-cache, no-transform')
    ctx.response.header('Connection', 'keep-alive')
    ctx.response.header('X-Accel-Buffering', 'no')
    return ctx.response.stream(Readable.from(output))
  }

  async conversations(ctx: HttpContext) {
    const input = await aiConversationListValidator.validate(ctx.request.qs())
    const service = await app.container.make(AiChatService)
    return ctx.response.ok(
      await service.list(requireTenantId(ctx), ctx.auth.getUserOrFail().id, input)
    )
  }

  async conversation(ctx: HttpContext) {
    const service = await app.container.make(AiChatService)
    const data = await service.get(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id,
      Number(ctx.params.id)
    )
    return ctx.response.ok({ data })
  }

  async destroyConversation(ctx: HttpContext) {
    const service = await app.container.make(AiChatService)
    await service.delete(requireTenantId(ctx), ctx.auth.getUserOrFail().id, Number(ctx.params.id))
    return ctx.response.noContent()
  }
}
