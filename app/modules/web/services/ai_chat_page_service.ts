import { inject } from '@adonisjs/core'

import AiChatService from '#modules/ai/services/ai_chat_service'
import AiProviderFactory from '#modules/ai/services/ai_provider_factory'
import type { WebAiChatPageData } from '#modules/web/interfaces/ai_chat_page_interface'

@inject()
export default class AiChatPageService {
  constructor(
    private aiChatService: AiChatService,
    private aiProviderFactory: AiProviderFactory
  ) {}

  async page(
    tenantId: number,
    userId: number,
    conversationId?: number
  ): Promise<WebAiChatPageData> {
    const [list, conversation] = await Promise.all([
      this.aiChatService.list(tenantId, userId, { per_page: 100 }),
      conversationId === undefined
        ? Promise.resolve(null)
        : this.aiChatService.get(tenantId, userId, conversationId),
    ])

    return {
      conversations: list.data,
      conversation,
      ai_available: this.aiProviderFactory.isAvailable(),
    }
  }
}
