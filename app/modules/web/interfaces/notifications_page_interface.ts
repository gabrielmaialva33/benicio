import type { NotificationType } from '#modules/notifications/interfaces/notification_interface'

/** Which slice of the inbox the page is showing. */
export const NOTIFICATION_FILTERS = ['all', 'unread', 'read'] as const

export type NotificationFilter = (typeof NOTIFICATION_FILTERS)[number]

/**
 * Flattened for the page: the model nests the actor relation and keeps Luxon
 * dates, neither of which survives serialisation in a shape React wants.
 */
export type WebNotification = {
  id: number
  type: NotificationType
  title: string
  message: string
  read_at: string | null
  created_at: string
  action_url: string | null
  action_text: string | null
  actor_name: string | null
}

export type WebNotificationsData = {
  notifications: WebNotification[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  filters: {
    filter: NotificationFilter
    type: NotificationType | null
  }
  /** Drives the header badge and the "mark all" affordance. */
  unread_count: number
  /** Types present for this recipient, so the filter offers only real options. */
  available_types: NotificationType[]
}
