import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

import Message from '#modules/messages/models/message'
import type {
  CreateMessageData,
  MessageListInput,
} from '#modules/messages/interfaces/message_interface'

type ListOptions = Required<Pick<MessageListInput, 'page' | 'per_page' | 'box'>> &
  Omit<MessageListInput, 'page' | 'per_page' | 'box'>

export default class MessageRepository {
  async paginate(
    tenantId: number,
    userId: number,
    options: ListOptions
  ): Promise<ModelPaginatorContract<Message>> {
    const query = this.visibleQuery(tenantId, userId, options.box)
      .preload('sender')
      .preload('recipient')

    if (options.unread === true) query.where('recipient_id', userId).whereNull('read_at')
    if (options.unread === false) query.whereNotNull('read_at')
    if (options.priority) query.where('priority', options.priority)
    if (options.search) {
      query.where((search) =>
        search
          .whereILike('subject', `%${options.search}%`)
          .orWhereILike('body', `%${options.search}%`)
      )
    }
    return query.orderBy('created_at', 'desc').paginate(options.page, options.per_page)
  }

  async recent(tenantId: number, userId: number, limit: number): Promise<Message[]> {
    return this.visibleQuery(tenantId, userId, 'inbox')
      .preload('sender')
      .preload('recipient')
      .orderBy('created_at', 'desc')
      .limit(limit)
  }

  async findVisible(tenantId: number, userId: number, messageId: number): Promise<Message | null> {
    return this.visibleQuery(tenantId, userId, 'all')
      .where('id', messageId)
      .preload('sender')
      .preload('recipient')
      .first()
  }

  async findInbox(tenantId: number, userId: number, messageId: number): Promise<Message | null> {
    return this.visibleQuery(tenantId, userId, 'inbox').where('id', messageId).first()
  }

  async isUserInTenant(tenantId: number, userId: number): Promise<boolean> {
    return Boolean(
      await db
        .from('user_tenants')
        .innerJoin('users', 'users.id', 'user_tenants.user_id')
        .where('user_tenants.tenant_id', tenantId)
        .where('user_tenants.user_id', userId)
        .where('users.is_deleted', false)
        .first()
    )
  }

  async create(
    tenantId: number,
    senderId: number | null,
    data: CreateMessageData
  ): Promise<Message> {
    const message = await Message.create({
      tenant_id: tenantId,
      recipient_id: data.recipient_id,
      sender_id: senderId,
      subject: data.subject,
      body: data.body,
      priority: data.priority ?? 'normal',
      read_at: null,
      metadata: data.metadata ?? {},
    })
    return (await this.findVisible(tenantId, data.recipient_id, message.id))!
  }

  async markRead(message: Message): Promise<Message> {
    if (!message.read_at) {
      message.read_at = DateTime.now()
      await message.save()
    }
    return message
  }

  async markAllRead(tenantId: number, recipientId: number): Promise<number> {
    const updated = await this.visibleQuery(tenantId, recipientId, 'inbox')
      .whereNull('read_at')
      .update({ read_at: new Date(), updated_at: new Date() })
      .returning('id')
    return updated.length
  }

  async unreadCount(tenantId: number, recipientId: number): Promise<number> {
    const row = await this.visibleQuery(tenantId, recipientId, 'inbox')
      .whereNull('read_at')
      .count('* as total')
      .firstOrFail()
    return Number(row.$extras.total)
  }

  softDelete(message: Message): Promise<void> {
    return message.softDelete()
  }

  private visibleQuery(tenantId: number, userId: number, box: 'inbox' | 'sent' | 'all') {
    const query = Message.query().withScopes((scopes) => scopes.withTenant(tenantId))
    if (box === 'inbox') return query.where('recipient_id', userId)
    if (box === 'sent') return query.where('sender_id', userId)
    return query.where((visible) =>
      visible.where('recipient_id', userId).orWhere('sender_id', userId)
    )
  }
}
