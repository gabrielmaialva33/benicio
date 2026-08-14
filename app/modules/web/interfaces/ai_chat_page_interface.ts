import type {
  AiConversationMode,
  AiConversationStatus,
  AiMessageRole,
} from '#modules/ai/interfaces/ai_interface'

export type WebAiChatMessage = {
  id: number
  conversation_id: number
  role: AiMessageRole
  content: string
  created_at: string
}

export type WebAiConversation = {
  id: number
  title: string
  user_id: number
  mode: AiConversationMode
  status: AiConversationStatus
  last_error: string | null
  created_at: string
  updated_at: string
  messages?: WebAiChatMessage[]
  lastMessage?: WebAiChatMessage
}

export type WebAiChatPageData = {
  conversations: WebAiConversation[]
  conversation: WebAiConversation | null
  ai_available: boolean
}
