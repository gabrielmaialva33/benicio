import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ChatComposer } from '~/components/chat/chat_composer'

function renderComposer(overrides: Partial<Parameters<typeof ChatComposer>[0]> = {}) {
  const props: Parameters<typeof ChatComposer>[0] = {
    value: 'Analise este prazo',
    onChange: vi.fn(),
    onSend: vi.fn(),
    onCancel: vi.fn(),
    streaming: false,
    disabled: false,
    ...overrides,
  }
  render(<ChatComposer {...props} />)
  return props
}

describe('ChatComposer', () => {
  it('sends with Enter but preserves Shift+Enter for line breaks', () => {
    const props = renderComposer()
    const textarea = screen.getByRole('textbox', { name: 'Mensagem para a IA' })

    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    expect(props.onSend).not.toHaveBeenCalled()

    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(props.onSend).toHaveBeenCalledWith('Analise este prazo')
  })

  it('disables submission when the provider is unavailable', () => {
    const props = renderComposer({ disabled: true })

    expect(screen.getByRole('textbox', { name: 'Mensagem para a IA' })).toBeDisabled()
    expect(screen.getByPlaceholderText('Configure o provedor de IA para começar')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled()
    expect(props.onSend).not.toHaveBeenCalled()
  })

  it('exposes an explicit stop action during streaming', () => {
    const props = renderComposer({ streaming: true })

    fireEvent.click(screen.getByRole('button', { name: 'Interromper resposta' }))
    expect(props.onCancel).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Enviar mensagem' })).not.toBeInTheDocument()
  })
})
