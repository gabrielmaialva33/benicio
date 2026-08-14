import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

import NotFoundException from '#exceptions/not_found_exception'
import NotificationRepository from '#modules/notifications/repositories/notification_repository'
import type {
  CreateNotificationData,
  NotificationListInput,
} from '#modules/notifications/interfaces/notification_interface'
import type Notification from '#modules/notifications/models/notification'
import RealtimeService from '#modules/realtime/services/realtime_service'

@inject()
export default class NotificationService {
  constructor(
    private notificationRepository: NotificationRepository,
    private realtimeService: RealtimeService
  ) {}

  list(tenantId: number, recipientId: number, input: NotificationListInput) {
    return this.notificationRepository.paginate(tenantId, recipientId, {
      ...input,
      page: input.page ?? 1,
      per_page: input.per_page ?? 20,
    })
  }

  recent(tenantId: number, recipientId: number, limit: number) {
    return this.notificationRepository.recent(tenantId, recipientId, limit)
  }

  get(tenantId: number, recipientId: number, notificationId: number): Promise<Notification> {
    return this.findOrFail(tenantId, recipientId, notificationId)
  }

  async create(
    tenantId: number,
    actorId: number | null,
    input: CreateNotificationData
  ): Promise<Notification> {
    if (!(await this.notificationRepository.isUserInTenant(tenantId, input.recipient_id))) {
      throw new NotFoundException('Notification recipient not found in tenant')
    }
    const notification = await this.notificationRepository.create(tenantId, actorId, input)
    await this.realtimeService.notification(tenantId, notification.recipient_id, {
      event: 'notification.created',
      id: notification.id,
      occurred_at: notification.created_at.toUTC().toISO()!,
    })
    return notification
  }

  async markRead(
    tenantId: number,
    recipientId: number,
    notificationId: number
  ): Promise<Notification> {
    const notification = await this.notificationRepository.markRead(
      await this.findOrFail(tenantId, recipientId, notificationId)
    )
    await this.realtimeService.notification(tenantId, recipientId, {
      event: 'notification.read',
      id: notification.id,
      occurred_at: DateTime.utc().toISO()!,
    })
    return notification
  }

  async markAllRead(tenantId: number, recipientId: number): Promise<number> {
    const updated = await this.notificationRepository.markAllRead(tenantId, recipientId)
    await this.realtimeService.notification(tenantId, recipientId, {
      event: 'notification.read_all',
      id: 0,
      occurred_at: DateTime.utc().toISO()!,
    })
    return updated
  }

  unreadCount(tenantId: number, recipientId: number): Promise<number> {
    return this.notificationRepository.unreadCount(tenantId, recipientId)
  }

  async delete(tenantId: number, recipientId: number, notificationId: number): Promise<void> {
    const notification = await this.findOrFail(tenantId, recipientId, notificationId)
    await this.notificationRepository.softDelete(notification)
    await this.realtimeService.notification(tenantId, recipientId, {
      event: 'notification.deleted',
      id: notification.id,
      occurred_at: DateTime.utc().toISO()!,
    })
  }

  private async findOrFail(
    tenantId: number,
    recipientId: number,
    notificationId: number
  ): Promise<Notification> {
    const notification = await this.notificationRepository.find(
      tenantId,
      recipientId,
      notificationId
    )
    if (!notification) throw new NotFoundException('Notification not found')
    return notification
  }
}
