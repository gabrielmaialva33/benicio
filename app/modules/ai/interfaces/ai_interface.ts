export const AI_CONVERSATION_MODES = ['single', 'multi'] as const
export const AI_CONVERSATION_STATUSES = ['active', 'generating', 'error'] as const
export const AI_MESSAGE_ROLES = ['user', 'assistant'] as const
export const AI_PROFILES = ['fast', 'deep'] as const
export const AI_TURN_STATUSES = ['pending', 'completed', 'failed', 'cancelled'] as const
export const AI_MESSAGE_STATUSES = ['pending', 'completed', 'failed', 'truncated'] as const

export type AiConversationMode = (typeof AI_CONVERSATION_MODES)[number]
export type AiConversationStatus = (typeof AI_CONVERSATION_STATUSES)[number]
export type AiMessageRole = (typeof AI_MESSAGE_ROLES)[number]
export type AiProviderMessageRole = AiMessageRole | 'system'
export type AiProfile = (typeof AI_PROFILES)[number]
export type AiTurnStatus = (typeof AI_TURN_STATUSES)[number]
export type AiMessageStatus = (typeof AI_MESSAGE_STATUSES)[number]

export interface AiChatInput {
  message: string
  conversation_id?: number
  mode?: AiConversationMode
  profile?: AiProfile
  idempotency_key?: string
}

export interface AiConversationListInput {
  page?: number
  per_page?: number
}

export interface AiProviderMessage {
  role: AiProviderMessageRole
  content: string
}

export interface AiProviderResult {
  content: string
  provider: string
  model: string
  usage: Record<string, unknown>
}

export interface AiProviderChunk {
  content: string
  provider?: string
  model?: string
  usage?: Record<string, unknown>
}

export interface AiProvider {
  readonly name: string
  readonly model: string
  generate(messages: AiProviderMessage[], signal?: AbortSignal): Promise<AiProviderResult>
  stream(
    messages: AiProviderMessage[],
    signal?: AbortSignal
  ): AsyncGenerator<AiProviderChunk, void, void>
}

export interface ChatMessageDto {
  id: number
  conversation_id: number
  role: AiMessageRole
  content: string
  status: AiMessageStatus
  created_at: string
}

export interface ConversationDto {
  id: number
  title: string
  user_id: number
  mode: AiConversationMode
  status: AiConversationStatus
  last_error: string | null
  created_at: string
  updated_at: string
  messages?: ChatMessageDto[]
  lastMessage?: ChatMessageDto
}
