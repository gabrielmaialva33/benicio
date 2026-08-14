import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import ConflictException from '#exceptions/conflict_exception'
import AiChatService from '#modules/ai/services/ai_chat_service'
import AiChatPageService from '#modules/web/services/ai_chat_page_service'
import { inertiaRedirectBack, inertiaRedirectTo } from '#shared/http/inertia_redirect'
import { requireTenantId } from '#shared/http/tenant_context'

@inject()
export default class InertiaAiChatController {
  constructor(
    private aiChatPageService: AiChatPageService,
    private aiChatService: AiChatService
  ) {}

  async index(ctx: HttpContext) {
    return this.render(ctx)
  }

  async show(ctx: HttpContext) {
    return this.render(ctx, Number(ctx.params.id))
  }

  async destroy(ctx: HttpContext) {
    try {
      await this.aiChatService.delete(
        requireTenantId(ctx),
        ctx.auth.getUserOrFail().id,
        Number(ctx.params.id)
      )
      ctx.session.flash('success', 'Conversa removida com sucesso.')
      return inertiaRedirectTo(ctx, '/chat')
    } catch (error) {
      if (error instanceof ConflictException) {
        ctx.session.flash('error', 'Aguarde a resposta terminar antes de excluir esta conversa.')
        return inertiaRedirectBack(ctx)
      }
      throw error
    }
  }

  private async render(ctx: HttpContext, conversationId?: number) {
    const page = await this.aiChatPageService.page(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id,
      conversationId
    )

    return ctx.inertia.render('chat/index', page)
  }
}
