import { Link, router } from '@inertiajs/react'
import { AlertCircle, Bot, MessageSquareText, Plus, Trash2 } from 'lucide-react'

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
import { cn } from '~/lib/utils'
import type { AiConversation } from '~/types/ai'
import { formatShortDate as formatDate } from '~/lib/format'

function DeleteConversationButton({ conversation }: { conversation: AiConversation }) {
  const generating = conversation.status === 'generating'

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={generating}
          aria-label={`Excluir conversa ${conversation.title}`}
          className="flex size-8 shrink-0 items-center justify-center rounded p-1 text-gray-400 opacity-0 transition hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir esta conversa?</AlertDialogTitle>
          <AlertDialogDescription>
            O histórico “{conversation.title}” será removido da sua conta neste escritório.
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
  )
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  disabled,
}: {
  conversations: AiConversation[]
  activeConversationId?: number
  disabled: boolean
}) {
  return (
    <aside className="flex h-64 w-full shrink-0 flex-col border-b border-[#e1e3ea] bg-white lg:h-full lg:w-64 lg:border-b-0 lg:border-e">
      <div className="border-b border-[#e1e3ea] p-4">
        <Button
          asChild
          className="w-full justify-center rounded-lg bg-yol-cyan px-4 py-2 font-semibold text-white hover:bg-yol-cyan-hover"
          aria-disabled={disabled}
        >
          <Link href="/chat" className={cn(disabled && 'pointer-events-none opacity-60')}>
            <Plus className="size-4" />
            Nova conversa
          </Link>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="Histórico de conversas">
        {conversations.length === 0 ? (
          <div className="flex h-full min-h-36 flex-col items-center justify-center px-5 text-center">
            <MessageSquareText className="size-8 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-600">Nenhuma conversa ainda</p>
            <p className="mt-1 text-xs text-slate-400">Seu histórico aparece aqui.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => {
              const active = conversation.id === activeConversationId
              return (
                <div
                  key={conversation.id}
                  className={cn(
                    'group flex items-center gap-1 rounded-lg p-1 transition-colors',
                    active ? 'bg-orange-50 text-orange-500' : 'hover:bg-gray-100'
                  )}
                >
                  <Link
                    href={`/chat/${conversation.id}`}
                    aria-current={active ? 'page' : undefined}
                    className={cn('min-w-0 flex-1 px-1.5', disabled && 'pointer-events-none')}
                  >
                    <span className="flex items-center gap-2">
                      {conversation.status === 'error' ? (
                        <AlertCircle className="size-3.5 shrink-0 text-red-500" />
                      ) : (
                        <Bot
                          className={cn(
                            'size-3.5 shrink-0',
                            active ? 'text-[#f97316]' : 'text-slate-400'
                          )}
                        />
                      )}
                      <span className="truncate text-sm text-slate-700">{conversation.title}</span>
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-2 ps-5.5 text-[0.68rem] text-slate-400">
                      <span className="truncate">
                        {conversation.lastMessage?.content ??
                          (conversation.status === 'error' ? 'Resposta interrompida' : 'Conversa')}
                      </span>
                      <time className="shrink-0">{formatDate(conversation.updated_at)}</time>
                    </span>
                  </Link>
                  <DeleteConversationButton conversation={conversation} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <footer className="hidden border-t border-[#e1e3ea] px-3 py-3 text-xs text-gray-500 lg:block">
        {conversations.length} conversa(s) neste escritório
      </footer>
    </aside>
  )
}
