import { router } from '@inertiajs/react'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  FileSearch,
  Gavel,
  Scale,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react'
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

const suggestions = [
  { icon: FileSearch, text: 'Resuma os pontos de atenção deste contrato' },
  { icon: Gavel, text: 'Estruture uma linha do tempo processual' },
  { icon: Scale, text: 'Compare os argumentos jurídicos das partes' },
]

interface ChatShellProps {
  conversations: AiConversation[]
  conversation: AiConversation | null
  aiAvailable: boolean
  successMessage?: string | null
  errorMessage?: string | null
}

export function ChatShell({
  conversations,
  conversation,
  aiAvailable,
  successMessage,
  errorMessage,
}: ChatShellProps) {
  const chat = useAiChat(conversation, aiAvailable)
  const messagesEnd = useRef<HTMLDivElement>(null)
  const busy = chat.isStreaming || conversation?.status === 'generating'

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ block: 'end' })
  }, [chat.messages.length, chat.streamingContent])

  return (
    <div className="space-y-4" data-testid="chat-page">
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="size-4" />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle className="size-4" />
          {errorMessage}
        </div>
      )}

      <section className="flex min-h-[680px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-card lg:h-[calc(100vh-200px)] lg:min-h-[640px]">
        <div className="flex min-h-0 w-full flex-col lg:flex-row">
          <ConversationSidebar
            conversations={conversations}
            activeConversationId={conversation?.id}
            disabled={chat.isStreaming}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <header className="flex min-h-18 items-center justify-between gap-4 border-b border-slate-200/80 px-4 py-3 dark:border-white/10 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#373737] text-white dark:bg-white dark:text-slate-900">
                  <Sparkles className="size-5" />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate font-bold text-slate-900 dark:text-white">
                    {conversation?.title ?? 'Nova conversa'}
                  </h1>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {busy
                      ? 'Gerando resposta...'
                      : 'Assistente jurídico com histórico por escritório'}
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
              <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 sm:px-6">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  O histórico está disponível, mas o provedor de IA não está configurado neste
                  ambiente.
                </span>
              </div>
            )}
            {(chat.error || conversation?.status === 'error') && (
              <div className="flex items-start justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 sm:px-6">
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

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 dark:bg-background/40">
              {chat.messages.length === 0 && !chat.isStreaming ? (
                <div className="flex min-h-full flex-col items-center justify-center px-5 py-12 text-center">
                  <span className="flex size-16 items-center justify-center rounded-2xl bg-[#373737] text-white shadow-lg dark:bg-white dark:text-slate-900">
                    <Bot className="size-8" />
                  </span>
                  <h2 className="mt-5 text-xl font-black tracking-[-0.03em] text-slate-900 dark:text-white">
                    Como posso ajudar no caso?
                  </h2>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
                    Peça uma análise, organize informações ou trabalhe um rascunho. O contexto desta
                    conversa fica isolado no escritório ativo.
                  </p>
                  <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-3">
                    {suggestions.map(({ icon: Icon, text }) => (
                      <button
                        key={text}
                        type="button"
                        disabled={!aiAvailable}
                        onClick={() => chat.setDraft(text)}
                        className="rounded-xl border border-slate-200 bg-white p-3 text-left text-xs font-medium leading-5 text-slate-600 transition hover:border-orange-200 hover:bg-orange-50/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300"
                      >
                        <Icon className="mb-2 size-4 text-[#f97316]" />
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto w-full max-w-4xl divide-y divide-slate-100 dark:divide-white/5">
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
      <p className="text-center text-[0.68rem] text-slate-400">
        A IA pode errar. Confira prazos, valores, precedentes e dados sensíveis antes de usar a
        resposta.
      </p>
    </div>
  )
}
