import { Send, Square } from 'lucide-react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useRef } from 'react'

import { Button } from '~/components/ui/button'

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
    <form
      onSubmit={submit}
      className="border-t border-slate-200/80 bg-white p-3 dark:border-white/10 dark:bg-card sm:p-4"
    >
      <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-inner transition focus-within:border-cyan-400 focus-within:ring-3 focus-within:ring-cyan-400/10 dark:border-white/10 dark:bg-white/[0.03]">
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
          className="max-h-[180px] min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Mensagem para a IA"
        />
        {streaming ? (
          <Button
            type="button"
            mode="icon"
            variant="destructive"
            onClick={onCancel}
            aria-label="Interromper resposta"
            className="mb-0.5 shrink-0 rounded-xl"
          >
            <Square className="size-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            type="submit"
            mode="icon"
            disabled={disabled || !value.trim()}
            aria-label="Enviar mensagem"
            className="mb-0.5 shrink-0 rounded-xl bg-[#f97316] text-white hover:bg-[#ea680c]"
          >
            <Send className="size-4" />
          </Button>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[0.68rem] text-slate-400">
        <span>Enter envia · Shift + Enter quebra a linha</span>
        <span>{value.length.toLocaleString('pt-BR')} / 50.000</span>
      </div>
    </form>
  )
}
