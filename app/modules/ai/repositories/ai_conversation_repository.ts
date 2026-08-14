import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

import ConflictException from '#exceptions/conflict_exception'
import NotFoundException from '#exceptions/not_found_exception'
import AiConversation from '#modules/ai/models/ai_conversation'
import AiMessage from '#modules/ai/models/ai_message'
import type {
  AiChatInput,
  AiConversationListInput,
  AiProviderResult,
} from '#modules/ai/interfaces/ai_interface'

export interface AiTurn {
  conversation: AiConversation
  userMessage: AiMessage
}

export interface CompletedAiTurn {
  conversation: AiConversation
  assistantMessage: AiMessage
}

export default class AiConversationRepository {
  async beginTurn(tenantId: number, userId: number, input: AiChatInput): Promise<AiTurn> {
    return db.transaction(async (trx) => {
      let conversation: AiConversation

      if (input.conversation_id) {
        const existing = await AiConversation.query({ client: trx })
          .where('tenant_id', tenantId)
          .where('user_id', userId)
          .where('id', input.conversation_id)
          .whereNull('deleted_at')
          .forUpdate()
          .first()
        if (!existing) throw new NotFoundException('AI conversation not found')
        if (existing.status === 'generating') {
          throw new ConflictException('AI conversation is already generating a response')
        }
        if (input.mode) existing.mode = input.mode
        conversation = existing
      } else {
        conversation = await AiConversation.create(
          {
            tenant_id: tenantId,
            user_id: userId,
            title: this.titleFrom(input.message),
            mode: input.mode ?? 'single',
            status: 'active',
            last_error: null,
          },
          { client: trx }
        )
      }

      conversation.status = 'generating'
      conversation.last_error = null
      await conversation.save()

      const userMessage = await AiMessage.create(
        {
          tenant_id: tenantId,
          conversation_id: conversation.id,
          role: 'user',
          content: input.message,
          provider: null,
          model: null,
          usage: {},
        },
        { client: trx }
      )

      return { conversation, userMessage }
    })
  }

  async completeTurn(
    tenantId: number,
    userId: number,
    conversationId: number,
    result: AiProviderResult
  ): Promise<CompletedAiTurn> {
    return db.transaction(async (trx) => {
      const conversation = await AiConversation.query({ client: trx })
        .where('tenant_id', tenantId)
        .where('user_id', userId)
        .where('id', conversationId)
        .whereNull('deleted_at')
        .forUpdate()
        .first()
      if (!conversation) throw new NotFoundException('AI conversation not found')
      if (conversation.status !== 'generating') {
        throw new ConflictException('AI conversation turn is no longer active')
      }

      const assistantMessage = await AiMessage.create(
        {
          tenant_id: tenantId,
          conversation_id: conversation.id,
          role: 'assistant',
          content: result.content,
          provider: result.provider,
          model: result.model,
          usage: result.usage,
        },
        { client: trx }
      )
      conversation.status = 'active'
      conversation.last_error = null
      await conversation.save()

      return { conversation, assistantMessage }
    })
  }

  async failTurn(
    tenantId: number,
    userId: number,
    conversationId: number,
    errorMessage: string
  ): Promise<void> {
    await AiConversation.query()
      .where('tenant_id', tenantId)
      .where('user_id', userId)
      .where('id', conversationId)
      .where('status', 'generating')
      .whereNull('deleted_at')
      .update({
        status: 'error',
        last_error: errorMessage.slice(0, 500),
        updated_at: DateTime.now().toJSDate(),
      })
  }

  async contextMessages(tenantId: number, conversationId: number, limit: number) {
    const messages = await AiMessage.query()
      .where('tenant_id', tenantId)
      .where('conversation_id', conversationId)
      .whereIn('role', ['user', 'assistant'])
      .orderBy('id', 'desc')
      .limit(limit)
    return messages.reverse()
  }

  paginate(tenantId: number, userId: number, input: AiConversationListInput) {
    return AiConversation.query()
      .where('tenant_id', tenantId)
      .where('user_id', userId)
      .whereNull('deleted_at')
      .preload('messages', (query) => query.orderBy('id', 'desc').groupLimit(1))
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'desc')
      .paginate(input.page ?? 1, input.per_page ?? 20)
  }

  find(tenantId: number, userId: number, conversationId: number) {
    return AiConversation.query()
      .where('tenant_id', tenantId)
      .where('user_id', userId)
      .where('id', conversationId)
      .whereNull('deleted_at')
      .preload('messages', (query) => query.orderBy('id', 'asc'))
      .first()
  }

  async delete(tenantId: number, userId: number, conversationId: number): Promise<void> {
    await db.transaction(async (trx) => {
      const conversation = await AiConversation.query({ client: trx })
        .where('tenant_id', tenantId)
        .where('user_id', userId)
        .where('id', conversationId)
        .whereNull('deleted_at')
        .forUpdate()
        .first()
      if (!conversation) throw new NotFoundException('AI conversation not found')
      if (conversation.status === 'generating') {
        throw new ConflictException('Cannot delete an AI conversation while it is generating')
      }
      await conversation.softDelete()
    })
  }

  private titleFrom(message: string): string {
    const title = message.replace(/\s+/g, ' ').trim()
    return title.length <= 80 ? title : `${title.slice(0, 77).trimEnd()}...`
  }
}
