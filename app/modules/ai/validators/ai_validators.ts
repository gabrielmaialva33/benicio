import vine from '@vinejs/vine'

import { AI_CONVERSATION_MODES } from '#modules/ai/interfaces/ai_interface'

export const aiChatValidator = vine.compile(
  vine.object({
    message: vine.string().trim().minLength(1).maxLength(50_000),
    conversation_id: vine.number().positive().optional(),
    mode: vine.enum(AI_CONVERSATION_MODES).optional(),
  })
)

export const aiConversationListValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    per_page: vine.number().min(1).max(100).optional(),
  })
)
