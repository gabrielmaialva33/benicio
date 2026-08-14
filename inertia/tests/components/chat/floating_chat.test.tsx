import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FloatingChat } from '~/components/chat/floating_chat'
import { render } from '~/tests/test_utils'
import { streamAiChat } from '~/services/ai_chat_stream'

vi.mock('~/services/ai_chat_stream', async (importOriginal) => {
  const original = await importOriginal<typeof import('~/services/ai_chat_stream')>()
  return { ...original, streamAiChat: vi.fn() }
})

describe('FloatingChat', () => {
  beforeEach(() => {
    vi.mocked(streamAiChat).mockReset()
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('keeps the streamed conversation inside the floating widget', async () => {
    vi.mocked(streamAiChat).mockImplementation(async (_input, handlers) => {
      const conversation = { id: 42, title: 'Revisão de prazo' }
      handlers.onConversation?.(conversation)
      handlers.onChunk('O prazo termina amanhã.')
      return conversation
    })

    const { user } = render(<FloatingChat />)
    await user.click(screen.getByRole('button', { name: 'Abrir assistente IA' }))
    await user.type(screen.getByRole('textbox', { name: 'Mensagem para a IA' }), 'Revise o prazo')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))

    await waitFor(() => {
      expect(screen.getByText('Revisão de prazo')).toBeInTheDocument()
      expect(screen.getByText('O prazo termina amanhã.')).toBeInTheDocument()
    })
    expect(streamAiChat).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Revise o prazo', mode: 'single' }),
      expect.any(Object),
      expect.any(AbortSignal)
    )

    await user.click(screen.getByRole('button', { name: 'Minimizar assistente IA' }))
    expect(screen.getByRole('button', { name: 'Abrir assistente IA' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir assistente IA' }))
    expect(screen.getByText('O prazo termina amanhã.')).toBeInTheDocument()
  })

  it('clears the transient conversation when the widget is closed', async () => {
    const { user } = render(<FloatingChat />)
    await user.click(screen.getByRole('button', { name: 'Abrir assistente IA' }))
    await user.click(screen.getByRole('button', { name: 'Fechar assistente IA' }))
    await user.click(screen.getByRole('button', { name: 'Abrir assistente IA' }))

    expect(screen.getByText('Inicie uma conversa')).toBeInTheDocument()
  })
})
