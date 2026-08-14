import vine from '@vinejs/vine'

import { AI_CONVERSATION_MODES, AI_PROFILES } from '#modules/ai/interfaces/ai_interface'

export const aiChatValidator = vine.compile(
  vine.object({
    message: vine.string().trim().minLength(1).maxLength(20_000),
    conversation_id: vine.number().positive().optional(),
    mode: vine.enum(AI_CONVERSATION_MODES).optional(),
    profile: vine.enum(AI_PROFILES).optional(),
    idempotency_key: vine
      .string()
      .trim()
      .minLength(8)
      .maxLength(128)
      .regex(/^[A-Za-z0-9._:-]+$/)
      .optional(),
  })
)

export const aiConversationListValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    per_page: vine.number().min(1).max(100).optional(),
  })
)
