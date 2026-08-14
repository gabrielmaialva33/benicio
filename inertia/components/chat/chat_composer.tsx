import { Send, Square } from 'lucide-react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useRef } from 'react'

interface ChatComposerProps {
  value: string
  onChange: (value: string) => void
  onSend: (message: string) => void
  onCancel: () => void
  streaming: boolean
  disabled: boolean
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  onCancel,
  streaming,
  disabled,
}: ChatComposerProps) {
  const textarea = useRef<HTMLTextAreaElement>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!disabled && !streaming && value.trim()) onSend(value)
  }

  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!disabled && !streaming && value.trim()) onSend(value)
    }
  }

  const update = (next: string) => {
    onChange(next)
    const element = textarea.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`
  }

  return (
    <form onSubmit={submit} className="border-t border-gray-200 bg-white p-4">
      <div className="flex items-end gap-2">
        <textarea
          ref={textarea}
          name="message"
          value={value}
          onChange={(event) => update(event.target.value)}
          onKeyDown={keyDown}
          rows={1}
          maxLength={50_000}
          disabled={disabled}
          placeholder={
            disabled
              ? 'Configure o provedor de IA para começar'
              : 'Pergunte sobre um caso, prazo, contrato ou estratégia...'
          }
          className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#1cd6f4] placeholder:text-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50"
          aria-label="Mensagem para a IA"
        />
        {streaming ? (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Interromper resposta"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white"
          >
            <Square className="size-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            aria-label="Enviar mensagem"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm transition hover:from-orange-600 hover:to-orange-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="size-5" />
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-gray-500">
        <span>Enter envia · Shift + Enter quebra a linha</span>
        <span>{value.length.toLocaleString('pt-BR')} / 50.000</span>
      </div>
    </form>
  )
}
