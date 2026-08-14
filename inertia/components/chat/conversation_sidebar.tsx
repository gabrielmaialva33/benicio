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

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(date)
    .replace('.', '')
}

function DeleteConversationButton({ conversation }: { conversation: AiConversation }) {
  const generating = conversation.status === 'generating'

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={generating}
          aria-label={`Excluir conversa ${conversation.title}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed group-hover:opacity-100 group-focus-within:opacity-100 dark:hover:bg-red-500/10"
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
    <aside className="flex h-64 w-full shrink-0 flex-col border-b border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.02] lg:h-full lg:w-80 lg:border-b-0 lg:border-e">
      <div className="border-b border-slate-200/80 p-4 dark:border-white/10">
        <Button
          asChild
          className="w-full justify-center bg-[#f97316] text-white hover:bg-[#ea680c]"
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
            <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
              Nenhuma conversa ainda
            </p>
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
                    'group flex items-center gap-1 rounded-xl border px-2 py-2 transition',
                    active
                      ? 'border-orange-200 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/10'
                      : 'border-transparent hover:bg-white dark:hover:bg-white/[0.04]'
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
                      <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {conversation.title}
                      </span>
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

      <footer className="hidden border-t border-slate-200/80 px-4 py-3 text-xs text-slate-400 dark:border-white/10 lg:block">
        {conversations.length} conversa(s) neste escritório
      </footer>
    </aside>
  )
}
