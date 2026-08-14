import { createHash, randomUUID } from 'node:crypto'

import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ConflictException from '#exceptions/conflict_exception'
import NotFoundException from '#exceptions/not_found_exception'
import AiConversation from '#modules/ai/models/ai_conversation'
import AiMessage from '#modules/ai/models/ai_message'
import AiTurn from '#modules/ai/models/ai_turn'
import type {
  AiChatInput,
  AiConversationListInput,
  AiProfile,
  AiProviderResult,
} from '#modules/ai/interfaces/ai_interface'

export interface CompletedAiTurn {
  conversation: AiConversation
  assistantMessage: AiMessage
}

export interface BegunAiTurn {
  conversation: AiConversation
  turn: AiTurn
  replay?: CompletedAiTurn
}

export interface FailedTurnPartial extends AiProviderResult {
  status: 'truncated'
}

interface ResolvedAiChatInput extends AiChatInput {
  profile: AiProfile
}

export default class AiConversationRepository {
  async beginTurn(
    tenantId: number,
    userId: number,
    input: ResolvedAiChatInput,
    leaseMs: number
  ): Promise<BegunAiTurn> {
    return db.transaction(async (trx) => {
      const requestHash = this.requestHash(input)
      if (input.idempotency_key) {
        await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtext(?))', [
          `ai:${tenantId}:${userId}:${input.idempotency_key}`,
        ])
        const replay = await this.idempotentReplay(
          tenantId,
          userId,
          input.idempotency_key,
          requestHash,
          trx
        )
        if (replay) return replay
      }

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
        await this.recoverConversationLease(existing, leaseMs, trx)
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

      const now = DateTime.now()
      const turn = await AiTurn.create(
        {
          id: randomUUID(),
          tenant_id: tenantId,
          conversation_id: conversation.id,
          user_id: userId,
          idempotency_key: input.idempotency_key ?? null,
          request_hash: requestHash,
          profile: input.profile,
          status: 'pending',
          error: null,
          heartbeat_at: now,
          completed_at: null,
        },
        { client: trx }
      )

      conversation.status = 'generating'
      conversation.last_error = null
      await conversation.save()

      await AiMessage.create(
        {
          tenant_id: tenantId,
          conversation_id: conversation.id,
          turn_id: turn.id,
          role: 'user',
          content: input.message,
          status: 'pending',
          provider: null,
          model: null,
          usage: {},
        },
        { client: trx }
      )

      return { conversation, turn }
    })
  }

  async completeTurn(
    tenantId: number,
    userId: number,
    conversationId: number,
    turnId: string,
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

      const turn = await AiTurn.query({ client: trx })
        .where('tenant_id', tenantId)
        .where('user_id', userId)
        .where('conversation_id', conversationId)
        .where('id', turnId)
        .forUpdate()
        .first()
      if (!turn || turn.status !== 'pending' || conversation.status !== 'generating') {
        throw new ConflictException('AI conversation turn is no longer active')
      }

      const assistantMessage = await AiMessage.create(
        {
          tenant_id: tenantId,
          conversation_id: conversation.id,
          turn_id: turn.id,
          role: 'assistant',
          content: result.content,
          status: 'completed',
          provider: result.provider,
          model: result.model,
          usage: result.usage,
        },
        { client: trx }
      )
      await AiMessage.query({ client: trx })
        .where('tenant_id', tenantId)
        .where('turn_id', turn.id)
        .where('role', 'user')
        .where('status', 'pending')
        .update({ status: 'completed' })

      const completedAt = DateTime.now()
      turn.status = 'completed'
      turn.error = null
      turn.heartbeat_at = completedAt
      turn.completed_at = completedAt
      await turn.save()

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
    turnId: string,
    errorMessage: string,
    partial?: FailedTurnPartial
  ): Promise<void> {
    await db.transaction(async (trx) => {
      const turn = await AiTurn.query({ client: trx })
        .where('tenant_id', tenantId)
        .where('user_id', userId)
        .where('conversation_id', conversationId)
        .where('id', turnId)
        .forUpdate()
        .first()
      if (!turn || turn.status !== 'pending') return

      await AiMessage.query({ client: trx })
        .where('tenant_id', tenantId)
        .where('turn_id', turn.id)
        .where('role', 'user')
        .where('status', 'pending')
        .update({ status: 'failed' })

      if (partial?.content.trim()) {
        await AiMessage.create(
          {
            tenant_id: tenantId,
            conversation_id: conversationId,
            turn_id: turn.id,
            role: 'assistant',
            content: partial.content,
            status: partial.status,
            provider: partial.provider,
            model: partial.model,
            usage: partial.usage,
          },
          { client: trx }
        )
      }

      const now = DateTime.now()
      turn.status = 'failed'
      turn.error = errorMessage.slice(0, 500)
      turn.heartbeat_at = now
      turn.completed_at = now
      await turn.save()

      await AiConversation.query({ client: trx })
        .where('tenant_id', tenantId)
        .where('user_id', userId)
        .where('id', conversationId)
        .where('status', 'generating')
        .whereNull('deleted_at')
        .update({
          status: 'error',
          last_error: errorMessage.slice(0, 500),
          updated_at: now.toJSDate(),
        })
    })
  }

  async touchTurn(tenantId: number, userId: number, turnId: string): Promise<void> {
    const now = DateTime.now().toJSDate()
    await AiTurn.query()
      .where('tenant_id', tenantId)
      .where('user_id', userId)
      .where('id', turnId)
      .where('status', 'pending')
      .update({ heartbeat_at: now, updated_at: now })
  }

  async contextMessages(tenantId: number, conversationId: number, limit: number) {
    const messages = await AiMessage.query()
      .where('tenant_id', tenantId)
      .where('conversation_id', conversationId)
      .where('status', 'completed')
      .whereIn('role', ['user', 'assistant'])
      .orderBy('id', 'desc')
      .limit(limit)
    return messages.reverse()
  }

  async paginate(
    tenantId: number,
    userId: number,
    input: AiConversationListInput,
    leaseMs: number
  ) {
    await this.recoverStaleTurns(tenantId, userId, leaseMs)
    return AiConversation.query()
      .where('tenant_id', tenantId)
      .where('user_id', userId)
      .whereNull('deleted_at')
      .preload('messages', (query) => query.orderBy('id', 'desc').groupLimit(1))
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'desc')
      .paginate(input.page ?? 1, input.per_page ?? 20)
  }

  async find(tenantId: number, userId: number, conversationId: number, leaseMs: number) {
    await this.recoverStaleTurns(tenantId, userId, leaseMs, conversationId)
    return AiConversation.query()
      .where('tenant_id', tenantId)
      .where('user_id', userId)
      .where('id', conversationId)
      .whereNull('deleted_at')
      .preload('messages', (query) => query.orderBy('id', 'asc'))
      .first()
  }

  async delete(
    tenantId: number,
    userId: number,
    conversationId: number,
    leaseMs: number
  ): Promise<void> {
    await this.recoverStaleTurns(tenantId, userId, leaseMs, conversationId)
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

  private async idempotentReplay(
    tenantId: number,
    userId: number,
    idempotencyKey: string,
    requestHash: string,
    trx: TransactionClientContract
  ): Promise<BegunAiTurn | null> {
    const turn = await AiTurn.query({ client: trx })
      .where('tenant_id', tenantId)
      .where('user_id', userId)
      .where('idempotency_key', idempotencyKey)
      .forUpdate()
      .first()
    if (!turn) return null
    if (turn.request_hash !== requestHash) {
      throw new ConflictException('Idempotency key was already used with another request')
    }
    if (turn.status === 'pending') {
      throw new ConflictException('An AI request with this idempotency key is still running')
    }
    if (turn.status !== 'completed') {
      throw new ConflictException('Idempotent AI request previously failed; use a new key')
    }

    const conversation = await AiConversation.query({ client: trx })
      .where('tenant_id', tenantId)
      .where('user_id', userId)
      .where('id', turn.conversation_id)
      .whereNull('deleted_at')
      .first()
    const assistantMessage = await AiMessage.query({ client: trx })
      .where('tenant_id', tenantId)
      .where('turn_id', turn.id)
      .where('role', 'assistant')
      .where('status', 'completed')
      .first()
    if (!conversation || !assistantMessage) {
      throw new ConflictException('Idempotent AI response is no longer available')
    }

    return {
      conversation,
      turn,
      replay: { conversation, assistantMessage },
    }
  }

  private async recoverConversationLease(
    conversation: AiConversation,
    leaseMs: number,
    trx: TransactionClientContract
  ): Promise<void> {
    if (conversation.status !== 'generating') return
    const cutoff = DateTime.now().minus({ milliseconds: leaseMs })
    if (!conversation.tenant_id) throw new Error('AI conversation has no tenant')
    const turn = await AiTurn.query({ client: trx })
      .where('tenant_id', conversation.tenant_id)
      .where('conversation_id', conversation.id)
      .where('status', 'pending')
      .orderBy('created_at', 'desc')
      .forUpdate()
      .first()

    if (turn && turn.heartbeat_at > cutoff) return
    if (!turn && conversation.updated_at > cutoff) return

    if (turn) await this.expireTurn(turn, trx)
    conversation.status = 'error'
    conversation.last_error = 'AI generation lease expired'
    await conversation.save()
  }

  private async recoverStaleTurns(
    tenantId: number,
    userId: number,
    leaseMs: number,
    conversationId?: number
  ): Promise<void> {
    const cutoff = DateTime.now().minus({ milliseconds: leaseMs })
    await db.transaction(async (trx) => {
      const query = AiTurn.query({ client: trx })
        .where('tenant_id', tenantId)
        .where('user_id', userId)
        .where('status', 'pending')
        .where('heartbeat_at', '<', cutoff.toJSDate())
        .orderBy('heartbeat_at', 'asc')
        .limit(100)
        .forUpdate()
      if (conversationId) query.where('conversation_id', conversationId)
      const turns = await query

      for (const turn of turns) {
        await this.expireTurn(turn, trx)
        await AiConversation.query({ client: trx })
          .where('tenant_id', tenantId)
          .where('user_id', userId)
          .where('id', turn.conversation_id)
          .where('status', 'generating')
          .update({
            status: 'error',
            last_error: 'AI generation lease expired',
            updated_at: DateTime.now().toJSDate(),
          })
      }
    })
  }

  private async expireTurn(turn: AiTurn, trx: TransactionClientContract): Promise<void> {
    const now = DateTime.now()
    turn.status = 'failed'
    turn.error = 'AI generation lease expired'
    turn.heartbeat_at = now
    turn.completed_at = now
    await turn.save()
    await AiMessage.query({ client: trx })
      .where('tenant_id', turn.tenant_id)
      .where('turn_id', turn.id)
      .where('status', 'pending')
      .update({ status: 'failed' })
  }

  private requestHash(input: ResolvedAiChatInput): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          conversation_id: input.conversation_id ?? null,
          message: input.message,
          mode: input.mode ?? null,
          profile: input.profile,
        })
      )
      .digest('hex')
  }

  private titleFrom(message: string): string {
    const title = message.replace(/\s+/g, ' ').trim()
    return title.length <= 80 ? title : `${title.slice(0, 77).trimEnd()}...`
  }
}
