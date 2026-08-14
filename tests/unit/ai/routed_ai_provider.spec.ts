import { test } from '@japa/runner'

import { AiProviderRequestError } from '#modules/ai/providers/openai_compatible_provider'
import RoutedAiProvider, { resetAiCircuitBreakers } from '#modules/ai/providers/routed_ai_provider'
import type {
  AiProvider,
  AiProviderChunk,
  AiProviderMessage,
  AiProviderResult,
} from '#modules/ai/interfaces/ai_interface'

type GenerateHandler = (messages: AiProviderMessage[]) => Promise<AiProviderResult>
type StreamHandler = (messages: AiProviderMessage[]) => AsyncGenerator<AiProviderChunk, void, void>

class StubProvider implements AiProvider {
  generateCalls = 0
  streamCalls = 0

  constructor(
    readonly name: string,
    readonly model: string,
    private readonly generateHandler: GenerateHandler,
    private readonly streamHandler: StreamHandler = async function* () {
      yield { content: 'ok' }
    }
  ) {}

  async generate(messages: AiProviderMessage[]): Promise<AiProviderResult> {
    this.generateCalls++
    return this.generateHandler(messages)
  }

  async *stream(messages: AiProviderMessage[]): AsyncGenerator<AiProviderChunk, void, void> {
    this.streamCalls++
    yield* this.streamHandler(messages)
  }
}

function router(candidates: AiProvider[], circuitFailureThreshold = 3): RoutedAiProvider {
  return new RoutedAiProvider({
    profile: 'fast',
    candidates,
    maxAttemptsPerCandidate: 1,
    baseDelayMs: 0,
    circuitFailureThreshold,
    circuitResetMs: 60_000,
    random: () => 0,
  })
}

function success(provider: string, model: string, content = 'resposta'): AiProviderResult {
  return { content, provider, model, usage: { total_tokens: 10 } }
}

test.group('Routed AI provider', (group) => {
  group.each.setup(() => resetAiCircuitBreakers())

  test('falls back after a transient provider failure', async ({ assert }) => {
    const primary = new StubProvider('groq', 'fast-primary', async () => {
      throw new AiProviderRequestError('rate limited', 429, 'req_1', 'http')
    })
    const fallback = new StubProvider('nvidia_nim', 'fast-fallback', async () =>
      success('nvidia_nim', 'fast-fallback')
    )

    const result = await router([primary, fallback]).generate([
      { role: 'user', content: 'Pergunta' },
    ])

    assert.equal(primary.generateCalls, 1)
    assert.equal(fallback.generateCalls, 1)
    assert.equal(result.provider, 'nvidia_nim')
    const routing = result.usage.routing as Record<string, unknown>
    assert.equal(routing.profile, 'fast')
    assert.equal(routing.provider, 'nvidia_nim')
    assert.equal(routing.model, 'fast-fallback')
    assert.equal(routing.attempt, 1)
    assert.isTrue(routing.fallback_used)
    assert.isNumber(routing.duration_ms)
  })

  test('hands a non-retryable client error to the next candidate without retrying', async ({
    assert,
  }) => {
    const primary = new StubProvider('groq', 'fast-primary', async () => {
      throw new AiProviderRequestError('invalid request', 400, 'req_2', 'http')
    })
    const fallback = new StubProvider('nvidia_nim', 'fast-fallback', async () =>
      success('nvidia_nim', 'fast-fallback')
    )

    const result = await router([primary, fallback]).generate([
      { role: 'user', content: 'Pergunta' },
    ])

    // Retrying the same provider would only repeat the rejection, but a
    // provider that permanently refuses (expired key, unpaid account, retired
    // model) must not take down a profile whose other candidate is healthy.
    assert.equal(primary.generateCalls, 1)
    assert.equal(fallback.generateCalls, 1)
    assert.equal(result.provider, 'nvidia_nim')
  })

  test('gives up without trying other candidates once the caller aborts', async ({ assert }) => {
    const primary = new StubProvider('groq', 'fast-primary', async () => {
      throw new AiProviderRequestError(
        'AI provider request was aborted',
        undefined,
        undefined,
        'aborted'
      )
    })
    const fallback = new StubProvider('nvidia_nim', 'fast-fallback', async () =>
      success('nvidia_nim', 'fast-fallback')
    )

    await assert.rejects(
      () => router([primary, fallback]).generate([{ role: 'user', content: 'Pergunta' }]),
      'AI provider request was aborted'
    )
    assert.equal(primary.generateCalls, 1)
    assert.equal(fallback.generateCalls, 0)
  })

  test('falls back in a stream only before content is emitted', async ({ assert }) => {
    const primary = new StubProvider(
      'groq',
      'fast-primary',
      async () => success('groq', 'fast-primary'),
      async function* () {
        throw new AiProviderRequestError('unavailable', 503, 'req_3', 'http')
      }
    )
    const fallback = new StubProvider(
      'nvidia_nim',
      'fast-fallback',
      async () => success('nvidia_nim', 'fast-fallback'),
      async function* () {
        yield { content: 'fallback' }
        yield { content: '', usage: { total_tokens: 4 } }
      }
    )

    const chunks: AiProviderChunk[] = []
    for await (const chunk of router([primary, fallback]).stream([
      { role: 'user', content: 'Pergunta' },
    ])) {
      chunks.push(chunk)
    }

    assert.equal(primary.streamCalls, 1)
    assert.equal(fallback.streamCalls, 1)
    assert.equal(chunks[0].content, 'fallback')
    const routing = chunks.at(-1)?.usage?.routing as Record<string, unknown>
    assert.equal(routing.provider, 'nvidia_nim')
    assert.isTrue(routing.fallback_used)
  })

  test('never splices a fallback response after the first streamed token', async ({ assert }) => {
    const primary = new StubProvider(
      'groq',
      'fast-primary',
      async () => success('groq', 'fast-primary'),
      async function* () {
        yield { content: 'parcial' }
        throw new AiProviderRequestError('stream failed', 503, 'req_4', 'http')
      }
    )
    const fallback = new StubProvider('nvidia_nim', 'fast-fallback', async () =>
      success('nvidia_nim', 'fast-fallback')
    )
    const chunks: string[] = []

    await assert.rejects(async () => {
      for await (const chunk of router([primary, fallback]).stream([
        { role: 'user', content: 'Pergunta' },
      ])) {
        if (chunk.content) chunks.push(chunk.content)
      }
    }, 'stream failed')

    assert.deepEqual(chunks, ['parcial'])
    assert.equal(fallback.streamCalls, 0)
  })

  test('opens the circuit after the configured number of transient failures', async ({
    assert,
  }) => {
    const primary = new StubProvider('groq', 'fast-primary', async () => {
      throw new AiProviderRequestError('unavailable', 503, 'req_5', 'http')
    })
    const fallback = new StubProvider('nvidia_nim', 'fast-fallback', async () =>
      success('nvidia_nim', 'fast-fallback')
    )
    const routed = router([primary, fallback], 1)

    await routed.generate([{ role: 'user', content: 'Primeira' }])
    await routed.generate([{ role: 'user', content: 'Segunda' }])

    assert.equal(primary.generateCalls, 1)
    assert.equal(fallback.generateCalls, 2)
  })
})
