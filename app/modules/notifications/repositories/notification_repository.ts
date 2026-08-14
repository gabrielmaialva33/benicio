import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

import Notification from '#modules/notifications/models/notification'
import type {
  CreateNotificationData,
  NotificationListInput,
} from '#modules/notifications/interfaces/notification_interface'

type ListOptions = Required<Pick<NotificationListInput, 'page' | 'per_page'>> &
  Omit<NotificationListInput, 'page' | 'per_page'>

export default class NotificationRepository {
  async paginate(
    tenantId: number,
    recipientId: number,
    options: ListOptions
  ): Promise<ModelPaginatorContract<Notification>> {
    const query = this.recipientQuery(tenantId, recipientId).preload('actor')
    if (options.type) query.where('type', options.type)
    if (options.unread === true) query.whereNull('read_at')
    if (options.unread === false) query.whereNotNull('read_at')
    return query.orderBy('created_at', 'desc').paginate(options.page, options.per_page)
  }

  async recent(tenantId: number, recipientId: number, limit: number): Promise<Notification[]> {
    return this.recipientQuery(tenantId, recipientId)
      .preload('actor')
      .orderBy('created_at', 'desc')
      .limit(limit)
  }

  async find(
    tenantId: number,
    recipientId: number,
    notificationId: number
  ): Promise<Notification | null> {
    return this.recipientQuery(tenantId, recipientId)
      .where('id', notificationId)
      .preload('actor')
      .first()
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
    actorId: number | null,
    data: CreateNotificationData
  ): Promise<Notification> {
    const notification = await Notification.create({
      tenant_id: tenantId,
      recipient_id: data.recipient_id,
      actor_id: actorId,
      type: data.type ?? 'info',
      title: data.title,
      message: data.message,
      read_at: null,
      data: data.data ?? {},
      action_url: data.action_url ?? null,
      action_text: data.action_text ?? null,
    })
    return (await this.find(tenantId, data.recipient_id, notification.id))!
  }

  async markRead(notification: Notification): Promise<Notification> {
    if (!notification.read_at) {
      notification.read_at = DateTime.now()
      await notification.save()
    }
    return notification
  }

  async markAllRead(tenantId: number, recipientId: number): Promise<number> {
    const updated = await this.recipientQuery(tenantId, recipientId)
      .whereNull('read_at')
      .update({ read_at: new Date(), updated_at: new Date() })
      .returning('id')
    return updated.length
  }

  async unreadCount(tenantId: number, recipientId: number): Promise<number> {
    const row = await this.recipientQuery(tenantId, recipientId)
      .whereNull('read_at')
      .count('* as total')
      .firstOrFail()
    return Number(row.$extras.total)
  }

  softDelete(notification: Notification): Promise<void> {
    return notification.softDelete()
  }

  /**
   * Types this recipient has actually received, so the inbox filter offers the
   * nine possible values only when they mean something for this user.
   */
  async distinctTypes(tenantId: number, recipientId: number): Promise<string[]> {
    const rows = await this.recipientQuery(tenantId, recipientId).distinct('type').select('type')
    return rows.map((row) => row.type)
  }

  private recipientQuery(tenantId: number, recipientId: number) {
    return Notification.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where('recipient_id', recipientId)
  }
}
