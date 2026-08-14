import vine from '@vinejs/vine'

import {
  AI_ANALYSIS_STATUSES,
  AI_ANALYSIS_TYPES,
  AI_CONVERSATION_MODES,
  AI_DOCUMENT_ANALYSIS_TYPES,
  AI_DOCUMENT_TEMPLATE_TYPES,
  AI_PROFILES,
} from '#modules/ai/interfaces/ai_interface'

const legalOptions = (minimumTokens: number, maximumTokens: number) =>
  vine.object({
    model: vine
      .string()
      .trim()
      .minLength(3)
      .maxLength(255)
      .regex(/^[A-Za-z0-9._/-]+$/)
      .optional(),
    maxTokens: vine.number().range([minimumTokens, maximumTokens]).optional(),
    temperature: vine.number().range([0, 1]).optional(),
    language: vine.enum(['pt-BR', 'en-US', 'es-ES'] as const).optional(),
    profile: vine.enum(AI_PROFILES).optional(),
  })

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

export const analyzeDocumentValidator = vine.compile(
  vine.object({
    document_id: vine.number().positive(),
    analysis_type: vine.enum(AI_DOCUMENT_ANALYSIS_TYPES),
    options: legalOptions(100, 8_000).optional(),
  })
)

export const generateDocumentValidator = vine.compile(
  vine.object({
    template_type: vine.enum(AI_DOCUMENT_TEMPLATE_TYPES),
    variables: vine.record(vine.any()),
    options: legalOptions(500, 16_000).optional(),
  })
)

export const semanticSearchValidator = vine.compile(
  vine.object({
    query: vine.string().trim().minLength(3).maxLength(500),
    folder_id: vine.number().positive().optional(),
    document_ids: vine.array(vine.number().positive()).maxLength(100).optional(),
    limit: vine.number().range([1, 50]).optional(),
  })
)

export const textOrDocumentValidator = vine.compile(
  vine.object({
    text: vine.string().trim().minLength(10).maxLength(200_000).optional(),
    document_id: vine.number().positive().optional(),
  })
)

export const analyzePrecatorioValidator = vine.compile(
  vine.object({
    folder_id: vine.number().positive(),
    options: legalOptions(500, 8_000).optional(),
  })
)

export const aiAnalysisHistoryValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
    type: vine.enum(AI_ANALYSIS_TYPES).optional(),
    status: vine.enum(AI_ANALYSIS_STATUSES).optional(),
  })
)
