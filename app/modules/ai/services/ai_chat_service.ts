import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import BadGatewayException from '#exceptions/bad_gateway_exception'
import NotFoundException from '#exceptions/not_found_exception'
import env from '#start/env'
import AiProviderFactory from '#modules/ai/services/ai_provider_factory'
import AiConversationRepository from '#modules/ai/repositories/ai_conversation_repository'
import type AiConversation from '#modules/ai/models/ai_conversation'
import type AiMessage from '#modules/ai/models/ai_message'
import type {
  AiChatInput,
  AiConversationListInput,
  AiProvider,
  AiProviderMessage,
  AiProviderResult,
  ChatMessageDto,
  ConversationDto,
} from '#modules/ai/interfaces/ai_interface'

@inject()
export default class AiChatService {
  constructor(
    private readonly conversationRepository: AiConversationRepository,
    private readonly providerFactory: AiProviderFactory
  ) {}

  async chat(tenantId: number, userId: number, input: AiChatInput) {
    const provider = this.providerFactory.getOrFail()
    const conversation = await this.conversationRepository.beginTurn(tenantId, userId, input)

    let messages: AiProviderMessage[]
    try {
      messages = await this.providerMessages(tenantId, conversation.id)
    } catch (error) {
      await this.failTurn(tenantId, userId, conversation.id, error)
      throw error
    }

    let result: AiProviderResult
    try {
      result = await provider.generate(messages)
    } catch (error) {
      await this.failTurn(tenantId, userId, conversation.id, error)
      throw new BadGatewayException('AI provider request failed')
    }

    try {
      const completed = await this.conversationRepository.completeTurn(
        tenantId,
        userId,
        conversation.id,
        result
      )
      return {
        message: this.messageDto(completed.assistantMessage),
        conversation: this.conversationDto(completed.conversation),
      }
    } catch (error) {
      await this.failTurn(tenantId, userId, conversation.id, error)
      throw error
    }
  }

  async stream(
    tenantId: number,
    userId: number,
    input: AiChatInput
  ): Promise<AsyncGenerator<string, void, void>> {
    const provider = this.providerFactory.getOrFail()
    const conversation = await this.conversationRepository.beginTurn(tenantId, userId, input)

    try {
      const messages = await this.providerMessages(tenantId, conversation.id)
      return this.streamTurn(tenantId, userId, conversation, provider, messages)
    } catch (error) {
      await this.failTurn(tenantId, userId, conversation.id, error)
      throw error
    }
  }

  private async *streamTurn(
    tenantId: number,
    userId: number,
    conversation: AiConversation,
    provider: AiProvider,
    messages: AiProviderMessage[]
  ): AsyncGenerator<string, void, void> {
    const abortController = new AbortController()
    let persisted = false
    let failed = false

    try {
      let content = ''

      for await (const chunk of provider.stream(messages, abortController.signal)) {
        if (!chunk.content) continue
        content += chunk.content
        yield this.sse({ content: chunk.content })
      }
      if (!content.trim()) throw new Error('AI provider returned empty content')

      const completed = await this.conversationRepository.completeTurn(
        tenantId,
        userId,
        conversation.id,
        {
          content,
          provider: provider.name,
          model: provider.model,
          usage: {},
        }
      )
      persisted = true
      yield this.sse({
        content: '',
        conversation: {
          id: completed.conversation.id,
          title: completed.conversation.title,
        },
      })
      yield 'data: [DONE]\n\n'
    } catch (error) {
      failed = true
      await this.failTurn(tenantId, userId, conversation.id, error)
      yield this.sse({ error: { message: 'AI provider request failed' } })
      yield 'data: [DONE]\n\n'
    } finally {
      abortController.abort()
      if (!persisted && !failed) {
        await this.conversationRepository.failTurn(
          tenantId,
          userId,
          conversation.id,
          'AI stream was cancelled'
        )
      }
    }
  }

  async list(tenantId: number, userId: number, input: AiConversationListInput) {
    const conversations = await this.conversationRepository.paginate(tenantId, userId, input)
    return {
      data: conversations.all().map((conversation) => {
        const lastMessage = conversation.messages[0]
        return this.conversationDto(
          conversation,
          undefined,
          lastMessage ? this.messageDto(lastMessage) : undefined
        )
      }),
      meta: conversations.getMeta(),
    }
  }

  async get(tenantId: number, userId: number, conversationId: number): Promise<ConversationDto> {
    const conversation = await this.conversationRepository.find(tenantId, userId, conversationId)
    if (!conversation) throw new NotFoundException('AI conversation not found')
    return this.conversationDto(
      conversation,
      conversation.messages.map((message) => this.messageDto(message))
    )
  }

  delete(tenantId: number, userId: number, conversationId: number): Promise<void> {
    return this.conversationRepository.delete(tenantId, userId, conversationId)
  }

  private async providerMessages(
    tenantId: number,
    conversationId: number
  ): Promise<AiProviderMessage[]> {
    const maxMessages = env.get('AI_MAX_CONTEXT_MESSAGES') ?? 24
    const context = await this.conversationRepository.contextMessages(
      tenantId,
      conversationId,
      maxMessages
    )
    const messages: AiProviderMessage[] = context.map((message) => ({
      role: message.role,
      content: message.content,
    }))
    const systemPrompt = env.get('AI_SYSTEM_PROMPT')?.trim()
    if (systemPrompt) messages.unshift({ role: 'system', content: systemPrompt })
    return messages
  }

  private async failTurn(
    tenantId: number,
    userId: number,
    conversationId: number,
    error: unknown
  ): Promise<void> {
    logger.error({ err: error, tenantId, userId, conversationId }, 'AI chat turn failed')
    try {
      await this.conversationRepository.failTurn(
        tenantId,
        userId,
        conversationId,
        'AI provider request failed'
      )
    } catch (stateError) {
      logger.error(
        { err: stateError, tenantId, userId, conversationId },
        'Failed to persist AI chat error state'
      )
    }
  }

  private messageDto(message: AiMessage): ChatMessageDto {
    return {
      id: message.id,
      conversation_id: message.conversation_id,
      role: message.role,
      content: message.content,
      created_at: message.created_at.toUTC().toISO()!,
    }
  }

  private conversationDto(
    conversation: AiConversation,
    messages?: ChatMessageDto[],
    lastMessage?: ChatMessageDto
  ): ConversationDto {
    return {
      id: conversation.id,
      title: conversation.title,
      user_id: conversation.user_id,
      created_at: conversation.created_at.toUTC().toISO()!,
      updated_at: conversation.updated_at.toUTC().toISO()!,
      ...(messages ? { messages } : {}),
      ...(lastMessage ? { lastMessage } : {}),
    }
  }

  private sse(payload: unknown): string {
    return `data: ${JSON.stringify(payload)}\n\n`
  }
}
