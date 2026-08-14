import { Bot, Check, Copy, UserRound } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
      className={cn(
        'group flex gap-3 p-4 transition-colors',
        assistant ? 'bg-gray-50 hover:bg-gray-100/50' : 'bg-blue-50 hover:bg-blue-100/50'
      )}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full text-white',
          assistant
            ? 'bg-gradient-to-br from-cyan-500 to-cyan-600'
            : 'bg-gradient-to-br from-orange-500 to-orange-600'
        )}
      >
        {assistant ? <Bot className="size-5" /> : <UserRound className="size-5" />}
      </span>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-sm text-gray-900">
            {assistant ? 'Assistente IA' : 'Você'}
          </span>
          {assistant && (
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-1 rounded p-1 text-xs text-gray-400 opacity-0 transition hover:bg-white hover:text-gray-600 group-hover:opacity-100 focus:opacity-100"
              aria-label="Copiar resposta"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          )}
        </div>

        <div className="text-left text-sm leading-6 text-gray-800">
          {assistant ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ children, ...props }) => (
                  <a
                    {...props}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-semibold text-cyan-700 underline underline-offset-2"
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
                  <blockquote className="my-3 border-s-2 border-cyan-400 ps-3 text-gray-500">
                    {children}
                  </blockquote>
                ),
                pre: ({ children }) => (
                  <pre className="my-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                    {children}
                  </pre>
                ),
                code: ({ children, className }) => (
                  <code
                    className={cn(
                      className,
                      !className && 'rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs'
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
                  <th className="border border-gray-200 p-2 text-left">{children}</th>
                ),
                td: ({ children }) => <td className="border border-gray-200 p-2">{children}</td>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
        <time className="block text-xs text-gray-500">{formatTime(message.created_at)}</time>
      </div>
    </article>
  )
}

export function StreamingChatMessage({ content }: { content: string }) {
  return (
    <article className="flex gap-3 bg-gray-50 p-4" aria-live="polite" data-testid="chat-stream">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
        <Bot className="size-5" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <span className="block font-semibold text-sm text-gray-900">Assistente IA</span>
        {content ? (
          <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">
            {content}
            <span className="ms-0.5 inline-block h-4 w-0.5 animate-pulse bg-cyan-500 align-middle" />
          </p>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-current" />
            Pensando
          </span>
        )}
      </div>
    </article>
  )
}
