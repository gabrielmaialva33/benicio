export const NOTIFICATION_TYPES = [
  'info',
  'success',
  'warning',
  'error',
  'task',
  'hearing',
  'deadline',
  'message',
  'system',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export interface NotificationListInput {
  page?: number
  per_page?: number
  type?: NotificationType
  unread?: boolean
}

export interface CreateNotificationData {
  recipient_id: number
  type?: NotificationType
  title: string
  message: string
  data?: Record<string, unknown>
  action_url?: string | null
  action_text?: string | null
}
