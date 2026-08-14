import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import aiConfig from '#config/ai'
import BadGatewayException from '#exceptions/bad_gateway_exception'
import NotFoundException from '#exceptions/not_found_exception'
import AiProviderFactory from '#modules/ai/services/ai_provider_factory'
import { AiProviderRequestError } from '#modules/ai/providers/openai_compatible_provider'
import AiConversationRepository from '#modules/ai/repositories/ai_conversation_repository'
import type { FailedTurnPartial } from '#modules/ai/repositories/ai_conversation_repository'
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
    const profile = input.profile ?? aiConfig.defaultProfile
    const provider = this.providerFactory.getOrFail(profile)
    const begun = await this.conversationRepository.beginTurn(
      tenantId,
      userId,
      { ...input, profile },
      aiConfig.turnLeaseMs
    )
    if (begun.replay) {
      return {
        message: this.messageDto(begun.replay.assistantMessage),
        conversation: this.conversationDto(begun.replay.conversation),
      }
    }
    const { conversation, turn } = begun

    let messages: AiProviderMessage[]
    try {
      messages = await this.providerMessages(tenantId, conversation.id, input.message)
    } catch (error) {
      await this.failTurn(tenantId, userId, conversation.id, turn.id, error)
      throw error
    }

    let result: AiProviderResult
    try {
      result = await provider.generate(messages)
      result.usage = { ...result.usage, prompt_version: aiConfig.promptVersion }
    } catch (error) {
      await this.failTurn(tenantId, userId, conversation.id, turn.id, error)
      throw new BadGatewayException('AI provider request failed')
    }

    try {
      const completed = await this.conversationRepository.completeTurn(
        tenantId,
        userId,
        conversation.id,
        turn.id,
        result
      )
      return {
        message: this.messageDto(completed.assistantMessage),
        conversation: this.conversationDto(completed.conversation),
      }
    } catch (error) {
      await this.failTurn(tenantId, userId, conversation.id, turn.id, error)
      throw error
    }
  }

  async stream(
    tenantId: number,
    userId: number,
    input: AiChatInput
  ): Promise<AsyncGenerator<string, void, void>> {
    const profile = input.profile ?? aiConfig.defaultProfile
    const provider = this.providerFactory.getOrFail(profile)
    const begun = await this.conversationRepository.beginTurn(
      tenantId,
      userId,
      { ...input, profile },
      aiConfig.turnLeaseMs
    )
    if (begun.replay) return this.replayStream(begun.replay)
    const { conversation, turn } = begun

    try {
      const messages = await this.providerMessages(tenantId, conversation.id, input.message)
      return this.streamTurn(tenantId, userId, conversation, turn.id, provider, messages)
    } catch (error) {
      await this.failTurn(tenantId, userId, conversation.id, turn.id, error)
      throw error
    }
  }

  async list(tenantId: number, userId: number, input: AiConversationListInput) {
    const conversations = await this.conversationRepository.paginate(
      tenantId,
      userId,
      input,
      aiConfig.turnLeaseMs
    )
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
    const conversation = await this.conversationRepository.find(
      tenantId,
      userId,
      conversationId,
      aiConfig.turnLeaseMs
    )
    if (!conversation) throw new NotFoundException('AI conversation not found')
    return this.conversationDto(
      conversation,
      conversation.messages.map((message) => this.messageDto(message))
    )
  }

  delete(tenantId: number, userId: number, conversationId: number): Promise<void> {
    return this.conversationRepository.delete(
      tenantId,
      userId,
      conversationId,
      aiConfig.turnLeaseMs
    )
  }

  private async *streamTurn(
    tenantId: number,
    userId: number,
    conversation: AiConversation,
    turnId: string,
    provider: AiProvider,
    messages: AiProviderMessage[]
  ): AsyncGenerator<string, void, void> {
    const abortController = new AbortController()
    let persisted = false
    let failed = false
    let content = ''
    let providerName = provider.name
    let providerModel = provider.model
    let usage: Record<string, unknown> = {}
    let nextHeartbeatAt = Date.now() + 30_000

    try {
      for await (const chunk of provider.stream(messages, abortController.signal)) {
        if (chunk.provider) providerName = chunk.provider
        if (chunk.model) providerModel = chunk.model
        if (chunk.usage) usage = chunk.usage
        if (!chunk.content) continue
        content += chunk.content
        yield this.sse({ content: chunk.content })
        if (Date.now() >= nextHeartbeatAt) {
          await this.conversationRepository.touchTurn(tenantId, userId, turnId)
          nextHeartbeatAt = Date.now() + 30_000
        }
      }
      if (!content.trim()) throw new Error('AI provider returned empty content')

      const completed = await this.conversationRepository.completeTurn(
        tenantId,
        userId,
        conversation.id,
        turnId,
        {
          content,
          provider: providerName,
          model: providerModel,
          usage: { ...usage, prompt_version: aiConfig.promptVersion },
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
      await this.failTurn(
        tenantId,
        userId,
        conversation.id,
        turnId,
        error,
        this.partialResult(content, providerName, providerModel, usage)
      )
      yield this.sse({ error: { message: 'AI provider request failed' } })
      yield 'data: [DONE]\n\n'
    } finally {
      abortController.abort()
      if (!persisted && !failed) {
        await this.conversationRepository.failTurn(
          tenantId,
          userId,
          conversation.id,
          turnId,
          'AI stream was cancelled',
          this.partialResult(content, providerName, providerModel, usage)
        )
      }
    }
  }

  private async providerMessages(
    tenantId: number,
    conversationId: number,
    currentMessage: string
  ): Promise<AiProviderMessage[]> {
    const context = await this.conversationRepository.contextMessages(
      tenantId,
      conversationId,
      aiConfig.maxContextMessages
    )
    const messages: AiProviderMessage[] = []
    const currentMessageBudget = Math.max(
      1,
      aiConfig.maxContextChars - aiConfig.systemPrompt.length
    )
    const currentContent = currentMessage.slice(0, currentMessageBudget)
    let remainingChars = Math.max(
      0,
      aiConfig.maxContextChars - aiConfig.systemPrompt.length - currentContent.length
    )

    for (const message of context.toReversed()) {
      if (message.content.length > remainingChars && messages.length > 0) break
      messages.unshift({ role: message.role, content: message.content.slice(0, remainingChars) })
      remainingChars = Math.max(0, remainingChars - message.content.length)
      if (remainingChars === 0) break
    }

    messages.push({ role: 'user', content: currentContent })

    messages.unshift({ role: 'system', content: aiConfig.systemPrompt })
    return messages
  }

  private async failTurn(
    tenantId: number,
    userId: number,
    conversationId: number,
    turnId: string,
    error: unknown,
    partial?: FailedTurnPartial
  ): Promise<void> {
    logger.error(
      {
        tenantId,
        userId,
        conversationId,
        turnId,
        errorName: error instanceof Error ? error.name : 'unknown',
        errorCode: error instanceof AiProviderRequestError ? error.code : undefined,
        status: error instanceof AiProviderRequestError ? error.status : undefined,
        requestId: error instanceof AiProviderRequestError ? error.requestId : undefined,
      },
      'AI chat turn failed'
    )
    try {
      await this.conversationRepository.failTurn(
        tenantId,
        userId,
        conversationId,
        turnId,
        'AI provider request failed',
        partial
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
      status: message.status,
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
      mode: conversation.mode,
      status: conversation.status,
      last_error: conversation.last_error,
      created_at: conversation.created_at.toUTC().toISO()!,
      updated_at: conversation.updated_at.toUTC().toISO()!,
      ...(messages ? { messages } : {}),
      ...(lastMessage ? { lastMessage } : {}),
    }
  }

  private sse(payload: unknown): string {
    return `data: ${JSON.stringify(payload)}\n\n`
  }

  private partialResult(
    content: string,
    provider: string,
    model: string,
    usage: Record<string, unknown>
  ): FailedTurnPartial | undefined {
    if (!content.trim()) return undefined
    return {
      content,
      provider,
      model,
      usage: { ...usage, prompt_version: aiConfig.promptVersion },
      status: 'truncated',
    }
  }

  private async *replayStream(completed: {
    conversation: AiConversation
    assistantMessage: AiMessage
  }): AsyncGenerator<string, void, void> {
    yield this.sse({ content: completed.assistantMessage.content, replayed: true })
    yield this.sse({
      content: '',
      conversation: {
        id: completed.conversation.id,
        title: completed.conversation.title,
      },
      replayed: true,
    })
    yield 'data: [DONE]\n\n'
  }
}
