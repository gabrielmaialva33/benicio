import vine from '@vinejs/vine'

import { MESSAGE_BOXES, MESSAGE_PRIORITIES } from '#modules/messages/interfaces/message_interface'

export const listMessagesValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    per_page: vine.number().min(1).max(100).optional(),
    box: vine.enum(MESSAGE_BOXES).optional(),
    unread: vine.boolean().optional(),
    priority: vine.enum(MESSAGE_PRIORITIES).optional(),
    search: vine.string().trim().maxLength(255).optional(),
  })
)

export const createMessageValidator = vine.compile(
  vine.object({
    recipient_id: vine.number().positive(),
    subject: vine.string().trim().minLength(1).maxLength(255),
    body: vine.string().trim().minLength(1).maxLength(50_000),
    priority: vine.enum(MESSAGE_PRIORITIES).optional(),
    metadata: vine.record(vine.any()).optional(),
  })
)

export const messageRecentValidator = vine.compile(
  vine.object({ limit: vine.number().min(1).max(50).optional() })
)
