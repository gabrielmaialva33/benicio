import { router } from '@inertiajs/react'
import { AlertTriangle, MessageSquare, ShieldAlert, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import { useAiChat } from '~/hooks/use_ai_chat'
import type { AiConversation } from '~/types/ai'
import { ChatComposer } from './chat_composer'
import { ChatMessage, StreamingChatMessage } from './chat_message'
import { ConversationSidebar } from './conversation_sidebar'

interface ChatShellProps {
  conversations: AiConversation[]
  conversation: AiConversation | null
  aiAvailable: boolean
}

export function ChatShell({ conversations, conversation, aiAvailable }: ChatShellProps) {
  const chat = useAiChat(conversation, aiAvailable)
  const messagesEnd = useRef<HTMLDivElement>(null)
  const busy = chat.isStreaming || conversation?.status === 'generating'

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ block: 'end' })
  }, [chat.messages.length, chat.streamingContent])

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="chat-page">
      <section className="flex min-h-0 flex-1 overflow-hidden bg-white">
        <div className="flex min-h-0 w-full flex-col lg:flex-row">
          <ConversationSidebar
            conversations={conversations}
            activeConversationId={conversation?.id}
            disabled={chat.isStreaming}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between gap-4 border-b border-[#e1e3ea] bg-white p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-yol-cyan/10">
                  <MessageSquare className="size-5 text-yol-cyan" />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate font-semibold text-lg text-slate-900">
                    {conversation?.title ?? 'Nova conversa'}
                  </h1>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {busy ? 'Gerando resposta...' : 'Seu assistente jurídico inteligente'}
                  </p>
                </div>
              </div>
              {conversation && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      mode="icon"
                      disabled={busy}
                      aria-label="Excluir conversa atual"
                      className="shrink-0 text-red-500"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir a conversa atual?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O histórico será removido da sua conta neste escritório.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => router.delete(`/chat/${conversation.id}`)}
                      >
                        Excluir conversa
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </header>

            {!aiAvailable && (
              <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:px-6">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  O histórico está disponível, mas o provedor de IA não está configurado neste
                  ambiente.
                </span>
              </div>
            )}
            {(chat.error || conversation?.status === 'error') && (
              <div className="flex items-start justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:px-6">
                <span className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {chat.error ??
                    'A resposta anterior falhou. Você pode enviar a mensagem novamente.'}
                </span>
                {chat.error && (
                  <button type="button" onClick={chat.clearError} className="shrink-0 underline">
                    Fechar
                  </button>
                )}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50">
              {chat.messages.length === 0 && !chat.isStreaming ? (
                <div className="flex min-h-full flex-col items-center justify-center px-5 py-12 text-center">
                  <MessageSquare className="size-16 text-gray-400 opacity-30" />
                  <h2 className="mt-4 text-lg font-semibold text-gray-600">Inicie uma conversa</h2>
                  <p className="mt-2 max-w-lg text-sm text-gray-500">
                    Digite sua mensagem abaixo para começar.
                  </p>
                </div>
              ) : (
                <div className="w-full">
                  {chat.messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  {chat.isStreaming && <StreamingChatMessage content={chat.streamingContent} />}
                  <div ref={messagesEnd} />
                </div>
              )}
            </div>

            <ChatComposer
              value={chat.draft}
              onChange={chat.setDraft}
              onSend={chat.sendMessage}
              onCancel={chat.cancel}
              streaming={chat.isStreaming}
              disabled={!aiAvailable || (busy && !chat.isStreaming)}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
