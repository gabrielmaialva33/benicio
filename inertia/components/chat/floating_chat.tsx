import { Link } from '@inertiajs/react'
import { AlertTriangle, ExternalLink, MessageSquare, Minimize2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '~/components/ui/button'
import { useFloatingChat } from '~/hooks/use_floating_chat'
import { ChatComposer } from './chat_composer'
import { ChatMessage, StreamingChatMessage } from './chat_message'

export function FloatingChat() {
  const [open, setOpen] = useState(false)
  const chat = useFloatingChat()
  const messagesEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) messagesEnd.current?.scrollIntoView({ block: 'end' })
  }, [chat.messages.length, chat.streamingContent, open])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir assistente IA"
        className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-[#1cd6f4] text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1cd6f4] focus-visible:ring-offset-2"
      >
        <MessageSquare className="size-6" />
      </button>
    )
  }

  return (
    <section
      aria-label="Assistente IA flutuante"
      className="fixed inset-x-3 bottom-3 z-50 flex h-[min(600px,calc(100vh-1.5rem))] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96"
    >
      <header className="flex items-center justify-between gap-3 border-b border-[#1cd6f4] bg-[#1cd6f4] p-4 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
            <MessageSquare className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold">
              {chat.conversation?.title ?? 'Assistente IA'}
            </h2>
            <p className="mt-0.5 text-xs text-white/80">
              {chat.isStreaming ? 'Gerando resposta...' : 'Seu assistente jurídico inteligente'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            asChild
            variant="ghost"
            mode="icon"
            aria-label="Abrir página completa do assistente"
            className="text-white hover:bg-white/10 hover:text-white"
          >
            <Link href={chat.conversation ? `/chat/${chat.conversation.id}` : '/chat'}>
              <ExternalLink className="size-4" />
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            mode="icon"
            onClick={() => setOpen(false)}
            aria-label="Minimizar assistente IA"
            className="text-white hover:bg-white/10 hover:text-white"
          >
            <Minimize2 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            mode="icon"
            onClick={() => {
              chat.reset()
              setOpen(false)
            }}
            aria-label="Fechar assistente IA"
            className="text-white hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </Button>
        </div>
      </header>

      {chat.error && (
        <div className="flex items-start justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {chat.error}
          </span>
          <button type="button" onClick={chat.clearError} className="shrink-0 font-bold underline">
            Fechar
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        {chat.messages.length === 0 && !chat.isStreaming ? (
          <div className="flex min-h-full flex-col items-center justify-center px-7 py-10 text-center">
            <MessageSquare className="size-16 text-gray-400 opacity-30" />
            <h3 className="mt-4 font-semibold text-lg text-gray-600">Inicie uma conversa</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Digite sua mensagem abaixo para começar.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
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
        disabled={false}
      />
    </section>
  )
}
