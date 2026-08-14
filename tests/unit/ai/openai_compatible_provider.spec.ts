import { test } from '@japa/runner'

import OpenAiCompatibleProvider, {
  AiProviderRequestError,
} from '#modules/ai/providers/openai_compatible_provider'

test.group('OpenAI-compatible provider', () => {
  test('sends chat completions requests and parses content and usage', async ({ assert }) => {
    let requestUrl = ''
    let authorization = ''
    const fetcher = (async (input: Parameters<typeof globalThis.fetch>[0], init?: RequestInit) => {
      requestUrl = String(input)
      authorization = new Headers(init?.headers).get('authorization') ?? ''
      return new Response(
        JSON.stringify({
          choices: [{ message: { role: 'assistant', content: 'Resposta real' } }],
          usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }) as typeof globalThis.fetch

    const provider = new OpenAiCompatibleProvider(
      {
        baseUrl: 'https://provider.example/v1',
        apiKey: 'test-key',
        model: 'legal-model',
        timeoutMs: 1_000,
      },
      fetcher
    )
    const result = await provider.generate([{ role: 'user', content: 'Pergunta' }])

    assert.equal(requestUrl, 'https://provider.example/v1/chat/completions')
    assert.equal(authorization, 'Bearer test-key')
    assert.equal(result.content, 'Resposta real')
    assert.deepEqual(result.usage, {
      prompt_tokens: 4,
      completion_tokens: 2,
      total_tokens: 6,
    })
  })

  test('parses OpenAI-compatible SSE across transport chunks', async ({ assert }) => {
    let requestPayload: Record<string, unknown> = {}
    const encoder = new TextEncoder()
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Olá"'))
        controller.enqueue(
          encoder.encode('}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":" mundo"}}]}\n\n')
        )
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[],"usage":{"prompt_tokens":4,"completion_tokens":2,"total_tokens":6}}\n\n'
          )
        )
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
    const fetcher = (async (_input: Parameters<typeof globalThis.fetch>[0], init?: RequestInit) => {
      requestPayload = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response(body, { status: 200 })
    }) as typeof globalThis.fetch
    const provider = new OpenAiCompatibleProvider(
      {
        baseUrl: 'https://provider.example/v1',
        model: 'legal-model',
        timeoutMs: 1_000,
      },
      fetcher
    )

    const chunks: string[] = []
    let usage: Record<string, unknown> = {}
    for await (const chunk of provider.stream([{ role: 'user', content: 'Pergunta' }])) {
      if (chunk.content) chunks.push(chunk.content)
      if (chunk.usage) usage = chunk.usage
    }
    assert.deepEqual(chunks, ['Olá', ' mundo'])
    assert.deepEqual(usage, { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 })
    assert.deepEqual(requestPayload.stream_options, { include_usage: true })
  })

  test('normalizes upstream failures without exposing the provider body', async ({ assert }) => {
    const fetcher = (async () =>
      new Response('{"error":"sensitive upstream detail"}', {
        status: 429,
        headers: { 'x-request-id': 'req_test' },
      })) as typeof globalThis.fetch
    const provider = new OpenAiCompatibleProvider(
      {
        baseUrl: 'https://provider.example/v1',
        model: 'legal-model',
        timeoutMs: 1_000,
      },
      fetcher
    )

    try {
      await provider.generate([{ role: 'user', content: 'Pergunta' }])
      assert.fail('Expected provider request to fail')
    } catch (error) {
      assert.instanceOf(error, AiProviderRequestError)
      assert.equal((error as AiProviderRequestError).status, 429)
      assert.equal((error as AiProviderRequestError).requestId, 'req_test')
      assert.equal((error as AiProviderRequestError).code, 'http')
      assert.isTrue((error as AiProviderRequestError).retryable)
      assert.notInclude((error as Error).message, 'sensitive upstream detail')
    }
  })

  test('does not mark ordinary client errors as retryable', async ({ assert }) => {
    const fetcher = (async () => new Response('{}', { status: 400 })) as typeof globalThis.fetch
    const provider = new OpenAiCompatibleProvider(
      {
        baseUrl: 'https://provider.example/v1',
        model: 'legal-model',
        timeoutMs: 1_000,
      },
      fetcher
    )

    try {
      await provider.generate([{ role: 'user', content: 'Pergunta' }])
      assert.fail('Expected provider request to fail')
    } catch (error) {
      assert.instanceOf(error, AiProviderRequestError)
      assert.isFalse((error as AiProviderRequestError).retryable)
    }
  })

  test('rejects a truncated stream without the completion marker', async ({ assert }) => {
    const fetcher = (async () =>
      new Response('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n', {
        status: 200,
      })) as typeof globalThis.fetch
    const provider = new OpenAiCompatibleProvider(
      {
        baseUrl: 'https://provider.example/v1',
        model: 'legal-model',
        timeoutMs: 1_000,
      },
      fetcher
    )

    await assert.rejects(async () => {
      for await (const chunk of provider.stream([{ role: 'user', content: 'Pergunta' }])) {
        assert.equal(chunk.content, 'partial')
      }
    }, 'AI provider stream ended before completion')
  })
})
