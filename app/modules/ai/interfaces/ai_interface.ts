export const AI_CONVERSATION_MODES = ['single', 'multi'] as const
export const AI_CONVERSATION_STATUSES = ['active', 'generating', 'error'] as const
export const AI_MESSAGE_ROLES = ['user', 'assistant'] as const
export const AI_PROFILES = ['fast', 'deep'] as const
export const AI_TURN_STATUSES = ['pending', 'completed', 'failed', 'cancelled'] as const
export const AI_MESSAGE_STATUSES = ['pending', 'completed', 'failed', 'truncated'] as const
export const AI_DOCUMENT_ANALYSIS_TYPES = [
  'summary',
  'entities',
  'sentiment',
  'legal_review',
] as const
export const AI_DOCUMENT_TEMPLATE_TYPES = [
  'petition',
  'contract',
  'notification',
  'appeal',
  'motion',
] as const
export const AI_ANALYSIS_STATUSES = ['processing', 'completed', 'failed'] as const

export type AiConversationMode = (typeof AI_CONVERSATION_MODES)[number]
export type AiConversationStatus = (typeof AI_CONVERSATION_STATUSES)[number]
export type AiMessageRole = (typeof AI_MESSAGE_ROLES)[number]
export type AiProviderMessageRole = AiMessageRole | 'system'
export type AiProfile = (typeof AI_PROFILES)[number]
export type AiTurnStatus = (typeof AI_TURN_STATUSES)[number]
export type AiMessageStatus = (typeof AI_MESSAGE_STATUSES)[number]
export type AiDocumentAnalysisType = (typeof AI_DOCUMENT_ANALYSIS_TYPES)[number]
export type AiDocumentTemplateType = (typeof AI_DOCUMENT_TEMPLATE_TYPES)[number]
export type AiAnalysisStatus = (typeof AI_ANALYSIS_STATUSES)[number]

export interface AiGenerationOptions {
  maxTokens?: number
  temperature?: number
}

export interface AiLegalOptions extends AiGenerationOptions {
  language?: 'pt-BR' | 'en-US' | 'es-ES'
  model?: string
  profile?: AiProfile
}

export interface AnalyzeDocumentInput {
  document_id: number
  analysis_type: AiDocumentAnalysisType
  options?: AiLegalOptions
}

export interface GenerateDocumentInput {
  template_type: AiDocumentTemplateType
  variables: Record<string, unknown>
  options?: AiLegalOptions
}

export interface SemanticSearchInput {
  query: string
  folder_id?: number
  document_ids?: number[]
  limit?: number
}

export interface TextOrDocumentInput {
  text?: string
  document_id?: number
}

export interface AnalyzePrecatorioInput {
  folder_id: number
  options?: AiLegalOptions
}

export interface AiAnalysisHistoryInput {
  page?: number
  limit?: number
  type?: string
  status?: AiAnalysisStatus
}

export interface AiDocumentSource {
  id: number
  folder_id: number
  file_id: number
  title: string
  description: string | null
  metadata: Record<string, unknown>
  updated_at: string
  file_name: string
  file_type: string
  file_size: number
  storage_disk: import('#modules/files/interfaces/file_interface').FileStorageDisk
  file_updated_at: string
}

export interface AiDocumentChunkInput {
  qdrantPointId: string
  chunkIndex: number
  content: string
  contentHash: string
  metadata: Record<string, unknown>
}

export interface AiVectorPoint {
  pointId: string
  tenantId: number
  documentId: number
  folderId: number
  sourceHash: string
  embeddingModel: string
  vector: number[]
}

export interface AiVectorCandidate {
  pointId: string
  score: number
}

export interface AiSemanticSearchResult {
  id: number
  content: string
  similarity: number
  metadata: Record<string, unknown>
}

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
  generate(
    messages: AiProviderMessage[],
    signal?: AbortSignal,
    options?: AiGenerationOptions
  ): Promise<AiProviderResult>
  stream(
    messages: AiProviderMessage[],
    signal?: AbortSignal,
    options?: AiGenerationOptions
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
