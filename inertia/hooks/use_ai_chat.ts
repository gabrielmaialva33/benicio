import { router } from '@inertiajs/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AiChatStreamError, streamAiChat } from '~/services/ai_chat_stream'
import type { AiChatMessage, AiConversation } from '~/types/ai'

export function useAiChat(conversation: AiConversation | null, aiAvailable: boolean) {
  const [draft, setDraft] = useState('')
  const [pendingMessages, setPendingMessages] = useState<AiChatMessage[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortController = useRef<AbortController | null>(null)

  useEffect(() => {
    setPendingMessages([])
    setStreamingContent('')
  }, [conversation?.id, conversation?.updated_at])

  useEffect(
    () => () => {
      abortController.current?.abort()
    },
    []
  )

  const messages = useMemo(
    () => [...(conversation?.messages ?? []), ...pendingMessages],
    [conversation?.messages, pendingMessages]
  )

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim()
      if (!message || isStreaming) return
      if (!aiAvailable) {
        setError('O provedor de IA ainda não está configurado neste ambiente.')
        return
      }

      const controller = new AbortController()
      abortController.current = controller
      const temporaryConversationId = conversation?.id ?? -1
      const userMessage: AiChatMessage = {
        id: -Date.now(),
        conversation_id: temporaryConversationId,
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
      }

      setDraft('')
      setError(null)
      setStreamingContent('')
      setPendingMessages([userMessage])
      setIsStreaming(true)

      let assistantContent = ''
      try {
        const reference = await streamAiChat(
          {
            message,
            mode: conversation?.mode ?? 'single',
            ...(conversation ? { conversation_id: conversation.id } : {}),
          },
          {
            onChunk: (content) => {
              assistantContent += content
              setStreamingContent(assistantContent)
            },
          },
          controller.signal
        )

        if (assistantContent) {
          setPendingMessages([
            userMessage,
            {
              id: userMessage.id - 1,
              conversation_id: reference?.id ?? temporaryConversationId,
              role: 'assistant',
              content: assistantContent,
              created_at: new Date().toISOString(),
            },
          ])
          setStreamingContent('')
        }

        if (!conversation && reference) {
          router.visit(`/chat/${reference.id}`, { preserveScroll: true })
        } else {
          router.reload({ only: ['conversations', 'conversation'] })
        }
      } catch (caught) {
        const messageText = controller.signal.aborted
          ? 'Geração interrompida.'
          : caught instanceof AiChatStreamError
            ? caught.message
            : 'Não foi possível concluir a resposta da IA.'
        setError(messageText)
        setDraft(message)
        setPendingMessages([])
        setStreamingContent('')
        router.reload({ only: ['conversations', 'conversation'] })
      } finally {
        if (abortController.current === controller) abortController.current = null
        setIsStreaming(false)
      }
    },
    [aiAvailable, conversation, isStreaming]
  )

  const cancel = useCallback(() => abortController.current?.abort(), [])

  return {
    draft,
    setDraft,
    messages,
    streamingContent,
    isStreaming,
    error,
    clearError: () => setError(null),
    sendMessage,
    cancel,
  }
}
