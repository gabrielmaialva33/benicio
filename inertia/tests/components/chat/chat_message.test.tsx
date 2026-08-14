import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ChatMessage, StreamingChatMessage } from '~/components/chat/chat_message'
import type { AiChatMessage } from '~/types/ai'

const assistantMessage: AiChatMessage = {
  id: 1,
  conversation_id: 10,
  role: 'assistant',
  content:
    '**Fundamento:** prescrição intercorrente.\n\n- confira o prazo\n- valide a intimação\n\n[Fonte](https://example.com)',
  created_at: '2026-08-14T03:00:00.000Z',
}

describe('ChatMessage', () => {
  it('renders assistant Markdown, GFM-safe links and the copy action', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(<ChatMessage message={assistantMessage} />)

    expect(screen.getByText('Fundamento:').tagName).toBe('STRONG')
    expect(screen.getByText('confira o prazo').closest('li')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Fonte' })).toHaveAttribute(
      'href',
      'https://example.com'
    )
    expect(screen.getByRole('link', { name: 'Fonte' })).toHaveAttribute('target', '_blank')

    fireEvent.click(screen.getByRole('button', { name: 'Copiar resposta' }))
    expect(writeText).toHaveBeenCalledWith(assistantMessage.content)
  })

  it('keeps user messages as literal text instead of interpreting Markdown', () => {
    render(
      <ChatMessage
        message={{
          ...assistantMessage,
          id: 2,
          role: 'user',
          content: '**não interpretar**',
        }}
      />
    )

    expect(screen.getByText('**não interpretar**')).toBeInTheDocument()
    expect(screen.queryByText('não interpretar')).not.toBeInTheDocument()
  })

  it('announces streamed content while the response is being generated', () => {
    render(<StreamingChatMessage content="Resposta parcial" />)

    expect(screen.getByTestId('chat-stream')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText(/Resposta parcial/)).toBeInTheDocument()
  })
})
