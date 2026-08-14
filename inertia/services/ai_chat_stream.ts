import type { AiChatStreamInput, AiConversationReference } from '~/types/ai'

type AiStreamEvent =
  | { kind: 'chunk'; content: string; conversation?: AiConversationReference }
  | { kind: 'done' }
  | { kind: 'error'; message: string }
  | { kind: 'metadata'; conversation: AiConversationReference }

export interface AiStreamHandlers {
  onChunk: (content: string) => void
  onConversation?: (conversation: AiConversationReference) => void
}

export class AiChatStreamError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
    this.name = 'AiChatStreamError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function conversationReference(value: unknown): AiConversationReference | undefined {
  if (!isRecord(value) || typeof value.id !== 'number' || typeof value.title !== 'string') {
    return undefined
  }
  return { id: value.id, title: value.title }
}

export function parseAiSseEvent(event: string): AiStreamEvent | null {
  const data = event
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')

  if (!data) return null
  if (data.trim() === '[DONE]') return { kind: 'done' }

  let payload: unknown
  try {
    payload = JSON.parse(data) as unknown
  } catch {
    return { kind: 'error', message: 'A resposta da IA veio em um formato inválido.' }
  }

  if (!isRecord(payload)) {
    return { kind: 'error', message: 'A resposta da IA veio em um formato inválido.' }
  }

  if (isRecord(payload.error) && typeof payload.error.message === 'string') {
    return { kind: 'error', message: payload.error.message }
  }

  const conversation = conversationReference(payload.conversation)
  if (typeof payload.content === 'string' && payload.content.length > 0) {
    return { kind: 'chunk', content: payload.content, ...(conversation ? { conversation } : {}) }
  }
  if (conversation) {
    return { kind: 'metadata', conversation }
  }
  return null
}

function errorMessage(payload: unknown, status: number): string {
  if (isRecord(payload)) {
    if (typeof payload.message === 'string') return payload.message
    if (isRecord(payload.error) && typeof payload.error.message === 'string') {
      return payload.error.message
    }
    if (Array.isArray(payload.errors)) {
      const first = payload.errors[0]
      if (isRecord(first) && typeof first.message === 'string') return first.message
    }
  }

  if (status === 503) return 'O provedor de IA ainda não está configurado.'
  return 'Não foi possível iniciar a resposta da IA.'
}

async function responseError(response: Response): Promise<AiChatStreamError> {
  let payload: unknown
  try {
    payload = (await response.json()) as unknown
  } catch {
    payload = null
  }
  return new AiChatStreamError(errorMessage(payload, response.status), response.status)
}

export async function streamAiChat(
  input: AiChatStreamInput,
  handlers: AiStreamHandlers,
  signal?: AbortSignal
): Promise<AiConversationReference | null> {
  const response = await fetch('/api/v1/ai/chat/stream', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Accept': 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
    signal,
  })

  if (!response.ok) throw await responseError(response)
  if (!response.body) throw new AiChatStreamError('O navegador não recebeu o stream da IA.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completed = false
  let conversation: AiConversationReference | null = null

  const consume = (eventText: string) => {
    const event = parseAiSseEvent(eventText)
    if (!event) return
    if (event.kind === 'done') {
      completed = true
      return
    }
    if (event.kind === 'error') throw new AiChatStreamError(event.message)
    if (event.kind === 'chunk') handlers.onChunk(event.content)
    if ('conversation' in event && event.conversation) {
      conversation = event.conversation
      handlers.onConversation?.(event.conversation)
    }
  }

  try {
    while (!completed) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      buffer = buffer.replaceAll('\r\n', '\n').replaceAll('\r', '\n')

      let boundary = buffer.indexOf('\n\n')
      while (boundary >= 0) {
        consume(buffer.slice(0, boundary))
        buffer = buffer.slice(boundary + 2)
        if (completed) break
        boundary = buffer.indexOf('\n\n')
      }

      if (done) {
        if (buffer.trim()) consume(buffer)
        break
      }
    }
  } finally {
    if (!completed) {
      try {
        await reader.cancel()
      } catch {
        // The server may already have closed the response.
      }
    }
    reader.releaseLock()
  }

  if (!completed) throw new AiChatStreamError('O stream da IA terminou antes da confirmação.')
  return conversation
}
