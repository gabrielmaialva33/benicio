import { useCallback, useEffect, useRef, useState } from 'react'

import { AiChatStreamError, streamAiChat } from '~/services/ai_chat_stream'
import type { AiChatMessage, AiConversationReference } from '~/types/ai'

export function useFloatingChat() {
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<AiChatMessage[]>([])
  const [conversation, setConversation] = useState<AiConversationReference | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortController = useRef<AbortController | null>(null)
  const temporaryId = useRef(-1)
  const generation = useRef(0)

  useEffect(
    () => () => {
      generation.current += 1
      abortController.current?.abort()
    },
    []
  )

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim()
      if (!message || isStreaming || abortController.current) return

      const currentGeneration = generation.current + 1
      generation.current = currentGeneration
      const controller = new AbortController()
      abortController.current = controller
      const userMessage: AiChatMessage = {
        id: temporaryId.current--,
        conversation_id: conversation?.id ?? -1,
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
      }

      setDraft('')
      setError(null)
      setStreamingContent('')
      setMessages((current) => [...current, userMessage])
      setIsStreaming(true)

      let assistantContent = ''
      let conversationReference = conversation

      try {
        const reference = await streamAiChat(
          {
            message,
            mode: 'single',
            ...(conversation ? { conversation_id: conversation.id } : {}),
          },
          {
            onChunk: (content) => {
              if (generation.current !== currentGeneration) return
              assistantContent += content
              setStreamingContent(assistantContent)
            },
            onConversation: (nextConversation) => {
              if (generation.current !== currentGeneration) return
              conversationReference = nextConversation
              setConversation(nextConversation)
            },
          },
          controller.signal
        )

        if (generation.current !== currentGeneration) return
        if (reference) {
          conversationReference = reference
          setConversation(reference)
        }
        if (assistantContent) {
          setMessages((current) => [
            ...current,
            {
              id: temporaryId.current--,
              conversation_id: conversationReference?.id ?? -1,
              role: 'assistant',
              content: assistantContent,
              created_at: new Date().toISOString(),
            },
          ])
        }
        setStreamingContent('')
      } catch (caught) {
        if (generation.current !== currentGeneration) return
        setError(
          controller.signal.aborted
            ? 'Geração interrompida.'
            : caught instanceof AiChatStreamError
              ? caught.message
              : 'Não foi possível concluir a resposta da IA.'
        )
        setDraft(message)
        setStreamingContent('')
      } finally {
        if (generation.current === currentGeneration) {
          setIsStreaming(false)
          if (abortController.current === controller) abortController.current = null
        }
      }
    },
    [conversation, isStreaming]
  )

  const cancel = useCallback(() => abortController.current?.abort(), [])

  const reset = useCallback(() => {
    generation.current += 1
    abortController.current?.abort()
    abortController.current = null
    setDraft('')
    setMessages([])
    setConversation(null)
    setStreamingContent('')
    setIsStreaming(false)
    setError(null)
  }, [])

  return {
    draft,
    setDraft,
    messages,
    conversation,
    streamingContent,
    isStreaming,
    error,
    clearError: () => setError(null),
    sendMessage,
    cancel,
    reset,
  }
}
