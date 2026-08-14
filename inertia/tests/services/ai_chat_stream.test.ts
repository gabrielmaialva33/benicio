import { afterEach, describe, expect, it, vi } from 'vitest'

import { parseAiSseEvent, streamAiChat } from '~/services/ai_chat_stream'

function streamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()

  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
        controller.close()
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }
  )
}

describe('AI chat SSE client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses chunks, metadata, completion and provider errors', () => {
    expect(parseAiSseEvent('data: {"content":"Olá"}')).toEqual({
      kind: 'chunk',
      content: 'Olá',
    })
    expect(
      parseAiSseEvent('data: {"content":"","conversation":{"id":42,"title":"Prazos"}}')
    ).toEqual({
      kind: 'metadata',
      conversation: { id: 42, title: 'Prazos' },
    })
    expect(parseAiSseEvent('data: [DONE]')).toEqual({ kind: 'done' })
    expect(parseAiSseEvent('data: {"error":{"message":"Provider indisponível"}}')).toEqual({
      kind: 'error',
      message: 'Provider indisponível',
    })
  })

  it('reassembles events split across chunks and returns the conversation reference', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        streamResponse([
          'data: {"content":"Resposta "}\r\n\r',
          '\ndata: {"content":"em stream"}\n\n',
          'data: {"content":"","conversation":{"id":42,"title":"Prazo processual"}}\n\n',
          'data: [DONE]\n\n',
        ])
      )
    vi.stubGlobal('fetch', fetchMock)
    const chunks: string[] = []

    const conversation = await streamAiChat(
      { message: 'Analise o prazo' },
      { onChunk: (content) => chunks.push(content) }
    )

    expect(chunks).toEqual(['Resposta ', 'em stream'])
    expect(conversation).toEqual({ id: 42, title: 'Prazo processual' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/ai/chat/stream',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({ message: 'Analise o prazo' }),
      })
    )
  })

  it('fails loudly for malformed or prematurely closed streams', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamResponse(['data: {invalid}\n\n'])))

    await expect(streamAiChat({ message: 'Teste' }, { onChunk: vi.fn() })).rejects.toThrow(
      'A resposta da IA veio em um formato inválido.'
    )

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(streamResponse(['data: {"content":"incompleto"}\n\n']))
    )

    await expect(streamAiChat({ message: 'Teste' }, { onChunk: vi.fn() })).rejects.toThrow(
      'O stream da IA terminou antes da confirmação.'
    )
  })

  it('preserves the API error and HTTP status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'AI provider is disabled' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )

    const request = streamAiChat({ message: 'Teste' }, { onChunk: vi.fn() })

    await expect(request).rejects.toMatchObject({
      name: 'AiChatStreamError',
      message: 'AI provider is disabled',
      status: 503,
    })
  })
})
