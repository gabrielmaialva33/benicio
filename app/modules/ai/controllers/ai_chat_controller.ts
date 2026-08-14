import { Readable } from 'node:stream'

import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import aiConfig from '#config/ai'
import { requireTenantId } from '#shared/http/tenant_context'
import AiChatService from '#modules/ai/services/ai_chat_service'
import { aiChatValidator, aiConversationListValidator } from '#modules/ai/validators/ai_validators'

export default class AiChatController {
  async chat(ctx: HttpContext) {
    const input = await this.chatInput(ctx)
    const service = await app.container.make(AiChatService)
    return ctx.response.ok(
      await service.chat(requireTenantId(ctx), ctx.auth.getUserOrFail().id, input)
    )
  }

  async stream(ctx: HttpContext) {
    const input = await this.chatInput(ctx)
    const service = await app.container.make(AiChatService)
    const output = await service.stream(requireTenantId(ctx), ctx.auth.getUserOrFail().id, input)

    ctx.response.header('Content-Type', 'text/event-stream; charset=utf-8')
    ctx.response.header('Cache-Control', 'no-cache, no-transform')
    ctx.response.header('Connection', 'keep-alive')
    ctx.response.header('X-Accel-Buffering', 'no')
    return ctx.response.stream(Readable.from(this.withHeartbeat(output)))
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

  private chatInput(ctx: HttpContext) {
    return aiChatValidator.validate({
      ...ctx.request.all(),
      idempotency_key:
        ctx.request.header('idempotency-key') ?? ctx.request.input('idempotency_key'),
    })
  }

  private async *withHeartbeat(
    output: AsyncGenerator<string, void, void>
  ): AsyncGenerator<string, void, void> {
    const iterator = output[Symbol.asyncIterator]()
    try {
      while (true) {
        const next = iterator.next()
        let settled = false

        while (!settled) {
          const result = await this.nextOrHeartbeat(next)
          if (result.type === 'heartbeat') {
            yield ': heartbeat\n\n'
            continue
          }

          settled = true
          if (result.value.done) return
          yield result.value.value
        }
      }
    } finally {
      await iterator.return?.()
    }
  }

  private nextOrHeartbeat(
    next: Promise<IteratorResult<string, void>>
  ): Promise<{ type: 'heartbeat' } | { type: 'next'; value: IteratorResult<string, void> }> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => resolve({ type: 'heartbeat' }), aiConfig.streamHeartbeatMs)
      next.then(
        (value) => {
          clearTimeout(timeout)
          resolve({ type: 'next', value })
        },
        (error: unknown) => {
          clearTimeout(timeout)
          reject(error)
        }
      )
    })
  }
}
