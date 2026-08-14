export type AiConversationMode = 'single' | 'multi'
export type AiConversationStatus = 'active' | 'generating' | 'error'
export type AiMessageRole = 'user' | 'assistant'

export interface AiChatMessage {
  id: number
  conversation_id: number
  role: AiMessageRole
  content: string
  created_at: string
}

export interface AiConversation {
  id: number
  title: string
  user_id: number
  mode: AiConversationMode
  status: AiConversationStatus
  last_error: string | null
  created_at: string
  updated_at: string
  messages?: AiChatMessage[]
  lastMessage?: AiChatMessage
}

export interface AiChatStreamInput {
  message: string
  conversation_id?: number
  mode?: AiConversationMode
}

export interface AiConversationReference {
  id: number
  title: string
}
