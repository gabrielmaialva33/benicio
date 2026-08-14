import { randomUUID } from 'node:crypto'

import type {
  AiProvider,
  AiProviderChunk,
  AiProviderMessage,
  AiProviderResult,
} from '#modules/ai/interfaces/ai_interface'

interface OpenAiCompatibleProviderOptions {
  baseUrl: string
  apiKey?: string
  model: string
  timeoutMs: number
}

interface SsePayload {
  done: boolean
  content?: string
}

export class AiProviderRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly requestId?: string
  ) {
    super(message)
    this.name = 'AiProviderRequestError'
  }
}

export default class OpenAiCompatibleProvider implements AiProvider {
  readonly name = 'openai_compatible'
  readonly model: string

  private readonly endpoint: URL

  constructor(
    private readonly options: OpenAiCompatibleProviderOptions,
    private readonly fetcher: typeof globalThis.fetch = globalThis.fetch
  ) {
    this.model = options.model
    this.endpoint = new URL('chat/completions', `${options.baseUrl.replace(/\/$/, '')}/`)
    if (!['http:', 'https:'].includes(this.endpoint.protocol)) {
      throw new Error('AI_BASE_URL must use HTTP or HTTPS')
    }
  }

  async generate(messages: AiProviderMessage[], signal?: AbortSignal): Promise<AiProviderResult> {
    const abort = this.createAbortContext(signal)
    try {
      const response = await this.fetcher(this.endpoint, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ model: this.model, messages, stream: false }),
        signal: abort.signal,
      })
      this.assertSuccessful(response)

      const payload = (await response.json()) as unknown
      const content = this.extractMessageContent(payload)
      if (!content.trim()) throw new AiProviderRequestError('AI provider returned empty content')

      return {
        content,
        provider: this.name,
        model: this.model,
        usage: this.extractUsage(payload),
      }
    } catch (error) {
      throw this.normalizeError(error)
    } finally {
      abort.cleanup()
    }
  }

  async *stream(
    messages: AiProviderMessage[],
    signal?: AbortSignal
  ): AsyncGenerator<AiProviderChunk, void, void> {
    const abort = this.createAbortContext(signal)
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined

    try {
      const response = await this.fetcher(this.endpoint, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ model: this.model, messages, stream: true }),
        signal: abort.signal,
      })
      this.assertSuccessful(response)
      if (!response.body) throw new AiProviderRequestError('AI provider returned no stream body')

      reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finished = false

      while (!finished) {
        const { done, value } = await reader.read()
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
        buffer = buffer.replaceAll('\r\n', '\n')

        let boundary = buffer.indexOf('\n\n')
        while (boundary >= 0) {
          const event = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          const payload = this.parseSseEvent(event)
          if (payload.done) {
            finished = true
            break
          }
          if (payload.content) yield { content: payload.content }
          boundary = buffer.indexOf('\n\n')
        }

        if (done) {
          if (buffer.trim()) {
            const payload = this.parseSseEvent(buffer)
            if (payload.content) yield { content: payload.content }
            finished ||= payload.done
          }
          break
        }
      }
      if (!finished) {
        throw new AiProviderRequestError('AI provider stream ended before completion')
      }
    } catch (error) {
      throw this.normalizeError(error)
    } finally {
      if (reader) {
        try {
          await reader.cancel()
        } catch {
          // The upstream may already have closed the stream.
        }
        reader.releaseLock()
      }
      abort.cleanup()
    }
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Client-Request-Id': randomUUID(),
    }
    if (this.options.apiKey) headers.Authorization = `Bearer ${this.options.apiKey}`
    return headers
  }

  private assertSuccessful(response: Response): void {
    if (!response.ok) {
      throw new AiProviderRequestError(
        `AI provider request failed with status ${response.status}`,
        response.status,
        response.headers.get('x-request-id') ?? undefined
      )
    }
  }

  private extractMessageContent(payload: unknown): string {
    const choice = this.firstChoice(payload)
    if (!choice || !this.isRecord(choice.message) || typeof choice.message.content !== 'string') {
      throw new AiProviderRequestError('AI provider returned an invalid response')
    }
    return choice.message.content
  }

  private extractUsage(payload: unknown): Record<string, unknown> {
    if (!this.isRecord(payload) || !this.isRecord(payload.usage)) return {}
    return payload.usage
  }

  private parseSseEvent(event: string): SsePayload {
    const data = event
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')

    if (!data) return { done: false }
    if (data.trim() === '[DONE]') return { done: true }

    let payload: unknown
    try {
      payload = JSON.parse(data) as unknown
    } catch {
      throw new AiProviderRequestError('AI provider returned malformed stream data')
    }

    const choice = this.firstChoice(payload)
    if (!choice || !this.isRecord(choice.delta)) return { done: false }
    return typeof choice.delta.content === 'string'
      ? { done: false, content: choice.delta.content }
      : { done: false }
  }

  private firstChoice(payload: unknown): Record<string, unknown> | null {
    if (!this.isRecord(payload) || !Array.isArray(payload.choices)) return null
    const choice: unknown = payload.choices[0]
    return this.isRecord(choice) ? choice : null
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  private createAbortContext(externalSignal?: AbortSignal) {
    const controller = new AbortController()
    const forwardAbort = () => controller.abort(externalSignal?.reason)

    if (externalSignal?.aborted) forwardAbort()
    else externalSignal?.addEventListener('abort', forwardAbort, { once: true })

    const timeout = setTimeout(
      () => controller.abort(new Error('AI provider request timed out')),
      this.options.timeoutMs
    )

    return {
      signal: controller.signal,
      cleanup: () => {
        clearTimeout(timeout)
        externalSignal?.removeEventListener('abort', forwardAbort)
      },
    }
  }

  private normalizeError(error: unknown): AiProviderRequestError {
    if (error instanceof AiProviderRequestError) return error
    if (error instanceof Error && error.name === 'AbortError') {
      return new AiProviderRequestError('AI provider request was aborted')
    }
    return new AiProviderRequestError('AI provider request failed')
  }
}
