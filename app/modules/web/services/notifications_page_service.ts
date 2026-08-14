import { inject } from '@adonisjs/core'

import type {
  NotificationType,
  NOTIFICATION_TYPES,
} from '#modules/notifications/interfaces/notification_interface'
import NotificationRepository from '#modules/notifications/repositories/notification_repository'
import NotificationService from '#modules/notifications/services/notification_service'
import type {
  NotificationFilter,
  WebNotification,
  WebNotificationsData,
} from '#modules/web/interfaces/notifications_page_interface'
import type Notification from '#modules/notifications/models/notification'

const PER_PAGE = 20

@inject()
export default class NotificationsPageService {
  constructor(
    private notificationService: NotificationService,
    private notificationRepository: NotificationRepository
  ) {}

  async index(
    tenantId: number,
    recipientId: number,
    filter: NotificationFilter,
    type: NotificationType | undefined,
    page: number
  ): Promise<WebNotificationsData> {
    /**
     * The repository speaks `unread: boolean | undefined`; the page speaks
     * all/unread/read because a tri-state reads better as a tab strip than as
     * a checkbox that can be indeterminate.
     */
    const unread = filter === 'all' ? undefined : filter === 'unread'

    const [paginator, unreadCount, availableTypes] = await Promise.all([
      this.notificationService.list(tenantId, recipientId, {
        page,
        per_page: PER_PAGE,
        unread,
        type,
      }),
      this.notificationRepository.unreadCount(tenantId, recipientId),
      this.notificationRepository.distinctTypes(tenantId, recipientId),
    ])

    return {
      notifications: paginator.all().map((notification) => this.#map(notification)),
      meta: {
        current_page: paginator.currentPage,
        last_page: paginator.lastPage,
        per_page: paginator.perPage,
        total: paginator.total,
      },
      filters: { filter, type: type ?? null },
      unread_count: unreadCount,
      available_types: availableTypes as (typeof NOTIFICATION_TYPES)[number][],
    }
  }

  #map(notification: Notification): WebNotification {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read_at: notification.read_at?.toISO() ?? null,
      created_at: notification.created_at.toISO() ?? '',
      action_url: notification.action_url,
      action_text: notification.action_text,
      actor_name: notification.actor?.full_name ?? null,
    }
  }
}
