import { Bot, Check, Copy, UserRound } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import type { AiChatMessage } from '~/types/ai'

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
}

export function ChatMessage({ message }: { message: AiChatMessage }) {
  const assistant = message.role === 'assistant'
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <article
      data-testid={`chat-message-${message.role}`}
      className={cn('flex gap-3 px-4 py-5 sm:px-6', !assistant && 'flex-row-reverse')}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm',
          assistant
            ? 'bg-[#373737] text-white dark:bg-white dark:text-slate-900'
            : 'bg-[#f97316] text-white'
        )}
      >
        {assistant ? <Bot className="size-4.5" /> : <UserRound className="size-4.5" />}
      </span>
      <div className={cn('min-w-0 max-w-[88%] sm:max-w-[80%]', !assistant && 'text-right')}>
        <div className={cn('mb-1.5 flex items-center gap-2', !assistant && 'justify-end')}>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            {assistant ? 'Benício IA' : 'Você'}
          </span>
          <time className="text-[0.68rem] text-slate-400">{formatTime(message.created_at)}</time>
        </div>
        <div
          className={cn(
            'relative rounded-2xl px-4 py-3 text-left text-sm leading-6 shadow-sm',
            assistant
              ? 'border border-slate-200/80 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200'
              : 'bg-[#f97316] text-white'
          )}
        >
          {assistant ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ children, ...props }) => (
                  <a
                    {...props}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-semibold text-cyan-700 underline underline-offset-2 dark:text-cyan-300"
                  >
                    {children}
                  </a>
                ),
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="my-3 list-disc space-y-1 ps-5">{children}</ul>,
                ol: ({ children }) => (
                  <ol className="my-3 list-decimal space-y-1 ps-5">{children}</ol>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-3 border-s-2 border-cyan-400 ps-3 text-slate-500 dark:text-slate-400">
                    {children}
                  </blockquote>
                ),
                pre: ({ children }) => (
                  <pre className="my-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                    {children}
                  </pre>
                ),
                code: ({ children, className }) => (
                  <code
                    className={cn(
                      className,
                      !className &&
                        'rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10'
                    )}
                  >
                    {children}
                  </code>
                ),
                table: ({ children }) => (
                  <div className="my-3 overflow-x-auto">
                    <table className="w-full border-collapse text-xs">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-slate-200 p-2 text-left dark:border-white/10">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-slate-200 p-2 dark:border-white/10">{children}</td>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
        {assistant && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={copy}
            className="mt-1.5 h-7 px-2 text-[0.68rem] text-slate-400"
            aria-label="Copiar resposta"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        )}
      </div>
    </article>
  )
}

export function StreamingChatMessage({ content }: { content: string }) {
  return (
    <article className="flex gap-3 px-4 py-5 sm:px-6" aria-live="polite" data-testid="chat-stream">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#373737] text-white shadow-sm dark:bg-white dark:text-slate-900">
        <Bot className="size-4.5" />
      </span>
      <div className="min-w-0 max-w-[88%] sm:max-w-[80%]">
        <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
          Benício IA
        </span>
        <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
          {content ? (
            <p className="whitespace-pre-wrap">
              {content}
              <span className="ms-0.5 inline-block h-4 w-0.5 animate-pulse bg-cyan-500 align-middle" />
            </p>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current" />
              Pensando
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
