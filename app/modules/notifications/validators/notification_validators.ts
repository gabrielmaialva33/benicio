import vine from '@vinejs/vine'

import { NOTIFICATION_TYPES } from '#modules/notifications/interfaces/notification_interface'

export const listNotificationsValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    per_page: vine.number().min(1).max(100).optional(),
    type: vine.enum(NOTIFICATION_TYPES).optional(),
    unread: vine.boolean().optional(),
  })
)

export const createNotificationValidator = vine.compile(
  vine.object({
    recipient_id: vine.number().positive(),
    type: vine.enum(NOTIFICATION_TYPES).optional(),
    title: vine.string().trim().minLength(1).maxLength(255),
    message: vine.string().trim().minLength(1).maxLength(20_000),
    data: vine.record(vine.any()).optional(),
    action_url: vine.string().trim().url().maxLength(2048).optional().nullable(),
    action_text: vine.string().trim().minLength(1).maxLength(100).optional().nullable(),
  })
)

export const notificationRecentValidator = vine.compile(
  vine.object({ limit: vine.number().min(1).max(50).optional() })
)
