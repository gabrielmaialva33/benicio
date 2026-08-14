import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

import NotFoundException from '#exceptions/not_found_exception'
import MessageRepository from '#modules/messages/repositories/message_repository'
import type {
  CreateMessageData,
  MessageListInput,
} from '#modules/messages/interfaces/message_interface'
import type Message from '#modules/messages/models/message'
import RealtimeService from '#modules/realtime/services/realtime_service'

@inject()
export default class MessageService {
  constructor(
    private messageRepository: MessageRepository,
    private realtimeService: RealtimeService
  ) {}

  list(tenantId: number, userId: number, input: MessageListInput) {
    return this.messageRepository.paginate(tenantId, userId, {
      ...input,
      page: input.page ?? 1,
      per_page: input.per_page ?? 20,
      box: input.box ?? 'inbox',
    })
  }

  recent(tenantId: number, userId: number, limit: number) {
    return this.messageRepository.recent(tenantId, userId, limit)
  }

  async get(tenantId: number, userId: number, messageId: number): Promise<Message> {
    const message = await this.messageRepository.findVisible(tenantId, userId, messageId)
    if (!message) throw new NotFoundException('Message not found')
    return message
  }

  async create(tenantId: number, senderId: number, input: CreateMessageData): Promise<Message> {
    if (!(await this.messageRepository.isUserInTenant(tenantId, input.recipient_id))) {
      throw new NotFoundException('Message recipient not found in tenant')
    }
    const message = await this.messageRepository.create(tenantId, senderId, input)
    await this.realtimeService.message(tenantId, message.recipient_id, {
      event: 'message.created',
      id: message.id,
      occurred_at: message.created_at.toUTC().toISO()!,
    })
    return message
  }

  async markRead(tenantId: number, recipientId: number, messageId: number): Promise<Message> {
    const message = await this.findInboxOrFail(tenantId, recipientId, messageId)
    await this.messageRepository.markRead(message)
    if (message.sender_id) {
      await this.realtimeService.message(tenantId, message.sender_id, {
        event: 'message.read',
        id: message.id,
        occurred_at: DateTime.utc().toISO()!,
      })
    }
    return message
  }

  async markAllRead(tenantId: number, recipientId: number): Promise<number> {
    const updated = await this.messageRepository.markAllRead(tenantId, recipientId)
    await this.realtimeService.message(tenantId, recipientId, {
      event: 'message.read_all',
      id: 0,
      occurred_at: DateTime.utc().toISO()!,
    })
    return updated
  }

  unreadCount(tenantId: number, recipientId: number): Promise<number> {
    return this.messageRepository.unreadCount(tenantId, recipientId)
  }

  async delete(tenantId: number, recipientId: number, messageId: number): Promise<void> {
    const message = await this.findInboxOrFail(tenantId, recipientId, messageId)
    await this.messageRepository.softDelete(message)
    await this.realtimeService.message(tenantId, recipientId, {
      event: 'message.deleted',
      id: message.id,
      occurred_at: DateTime.utc().toISO()!,
    })
  }

  private async findInboxOrFail(
    tenantId: number,
    recipientId: number,
    messageId: number
  ): Promise<Message> {
    const message = await this.messageRepository.findInbox(tenantId, recipientId, messageId)
    if (!message) throw new NotFoundException('Message not found')
    return message
  }
}
