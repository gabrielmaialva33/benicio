import vine from '@vinejs/vine'

import { NOTIFICATION_TYPES } from '#modules/notifications/interfaces/notification_interface'
import { NOTIFICATION_FILTERS } from '#modules/web/interfaces/notifications_page_interface'

export const notificationsQueryValidator = vine.compile(
  vine.object({
    filter: vine.enum(NOTIFICATION_FILTERS).optional(),
    type: vine.enum(NOTIFICATION_TYPES).optional(),
    page: vine.number().positive().optional(),
  })
)
