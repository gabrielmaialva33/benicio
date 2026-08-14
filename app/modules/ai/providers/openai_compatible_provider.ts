import { randomUUID } from 'node:crypto'

import type { AiTimeoutsConfig } from '#config/ai'
import type {
  AiProvider,
  AiProviderChunk,
  AiProviderMessage,
  AiProviderResult,
} from '#modules/ai/interfaces/ai_interface'

export type AiProviderErrorCode = 'aborted' | 'http' | 'invalid_response' | 'network' | 'timeout'

type AiProviderTimeoutPhase = 'connect' | 'first_token' | 'idle' | 'total'

export interface OpenAiCompatibleProviderOptions {
  providerName?: string
  baseUrl: string
  apiKey?: string
  model: string
  maxTokens?: number
  timeoutMs?: number
  timeouts?: AiTimeoutsConfig
}

interface SsePayload {
  done: boolean
  content?: string
  usage?: Record<string, unknown>
}

interface AbortContext {
  signal: AbortSignal
  externalSignal?: AbortSignal
  timeoutPhase?: AiProviderTimeoutPhase
  setPhaseTimeout(phase: Exclude<AiProviderTimeoutPhase, 'total'>, milliseconds: number): void
  clearPhaseTimeout(): void
  cleanup(): void
}

export class AiProviderRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly requestId?: string,
    readonly code: AiProviderErrorCode = 'invalid_response'
  ) {
    super(message)
    this.name = 'AiProviderRequestError'
  }

  get retryable(): boolean {
    if (this.code === 'network' || this.code === 'timeout') return true
    if (this.code !== 'http' || !this.status) return false
    return this.status === 408 || this.status === 429 || this.status === 498 || this.status >= 500
  }
}

export default class OpenAiCompatibleProvider implements AiProvider {
  readonly name: string
  readonly model: string

  private readonly endpoint: URL
  private readonly timeouts: AiTimeoutsConfig

  constructor(
    private readonly options: OpenAiCompatibleProviderOptions,
    private readonly fetcher: typeof globalThis.fetch = globalThis.fetch
  ) {
    this.name = options.providerName ?? 'openai_compatible'
    this.model = options.model
    this.endpoint = new URL('chat/completions', `${options.baseUrl.replace(/\/$/, '')}/`)
    if (!['http:', 'https:'].includes(this.endpoint.protocol)) {
      throw new Error('AI provider base URL must use HTTP or HTTPS')
    }

    const legacyTimeout = options.timeoutMs ?? 60_000
    this.timeouts = options.timeouts ?? {
      connectMs: Math.min(5_000, legacyTimeout),
      firstTokenMs: legacyTimeout,
      idleMs: legacyTimeout,
      totalMs: legacyTimeout,
    }
    if (
      Object.values(this.timeouts).some(
        (timeout) => !Number.isInteger(timeout) || timeout < 1 || timeout > 600_000
      )
    ) {
      throw new Error('AI provider timeouts are invalid')
    }
  }

  async generate(messages: AiProviderMessage[], signal?: AbortSignal): Promise<AiProviderResult> {
    const abort = this.createAbortContext(signal)
    try {
      abort.setPhaseTimeout('connect', this.timeouts.connectMs)
      const response = await this.fetcher(this.endpoint, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(this.requestPayload(messages, false)),
        signal: abort.signal,
      })
      abort.clearPhaseTimeout()
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
      throw this.normalizeError(error, abort)
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
      abort.setPhaseTimeout('connect', this.timeouts.connectMs)
      const response = await this.fetcher(this.endpoint, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(this.requestPayload(messages, true)),
        signal: abort.signal,
      })
      abort.clearPhaseTimeout()
      this.assertSuccessful(response)
      if (!response.body) throw new AiProviderRequestError('AI provider returned no stream body')

      reader = response.body.getReader()
      const decoder = new TextDecoder()
      const firstTokenDeadline = Date.now() + this.timeouts.firstTokenMs
      let buffer = ''
      let finished = false
      let receivedContent = false

      while (!finished) {
        const readTimeout = receivedContent
          ? this.timeouts.idleMs
          : Math.max(1, firstTokenDeadline - Date.now())
        abort.setPhaseTimeout(receivedContent ? 'idle' : 'first_token', readTimeout)
        const { done, value } = await reader.read()
        abort.clearPhaseTimeout()
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
        buffer = buffer.replaceAll('\r\n', '\n')

        let boundary = buffer.indexOf('\n\n')
        while (boundary >= 0) {
          const event = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          const payload = this.parseSseEvent(event)
          if (payload.usage) {
            yield {
              content: '',
              provider: this.name,
              model: this.model,
              usage: payload.usage,
            }
          }
          if (payload.content) {
            receivedContent = true
            yield { content: payload.content, provider: this.name, model: this.model }
          }
          if (payload.done) {
            finished = true
            break
          }
          boundary = buffer.indexOf('\n\n')
        }

        if (done) {
          if (buffer.trim()) {
            const payload = this.parseSseEvent(buffer)
            if (payload.usage) {
              yield {
                content: '',
                provider: this.name,
                model: this.model,
                usage: payload.usage,
              }
            }
            if (payload.content) {
              receivedContent = true
              yield { content: payload.content, provider: this.name, model: this.model }
            }
            finished ||= payload.done
          }
          break
        }
      }
      if (!finished) {
        throw new AiProviderRequestError('AI provider stream ended before completion')
      }
    } catch (error) {
      throw this.normalizeError(error, abort)
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

  private requestPayload(messages: AiProviderMessage[], stream: boolean): Record<string, unknown> {
    return {
      model: this.model,
      messages,
      stream,
      ...(this.options.maxTokens ? { max_tokens: this.options.maxTokens } : {}),
      ...(stream ? { stream_options: { include_usage: true } } : {}),
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
        response.headers.get('x-request-id') ??
          response.headers.get('request-id') ??
          response.headers.get('cf-ray') ??
          undefined,
        'http'
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

    const usage = this.extractUsage(payload)
    const choice = this.firstChoice(payload)
    const content =
      choice && this.isRecord(choice.delta) && typeof choice.delta.content === 'string'
        ? choice.delta.content
        : undefined

    return {
      done: false,
      ...(content ? { content } : {}),
      ...(Object.keys(usage).length ? { usage } : {}),
    }
  }

  private firstChoice(payload: unknown): Record<string, unknown> | null {
    if (!this.isRecord(payload) || !Array.isArray(payload.choices)) return null
    const choice: unknown = payload.choices[0]
    return this.isRecord(choice) ? choice : null
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  private createAbortContext(externalSignal?: AbortSignal): AbortContext {
    const controller = new AbortController()
    const context: AbortContext = {
      signal: controller.signal,
      externalSignal,
      setPhaseTimeout: () => {},
      clearPhaseTimeout: () => {},
      cleanup: () => {},
    }
    let phaseTimeout: ReturnType<typeof setTimeout> | undefined
    const forwardAbort = () => controller.abort(externalSignal?.reason)

    if (externalSignal?.aborted) forwardAbort()
    else externalSignal?.addEventListener('abort', forwardAbort, { once: true })

    const totalTimeout = setTimeout(() => {
      context.timeoutPhase = 'total'
      controller.abort(new Error('AI provider total timeout'))
    }, this.timeouts.totalMs)

    context.setPhaseTimeout = (phase, milliseconds) => {
      if (phaseTimeout) clearTimeout(phaseTimeout)
      phaseTimeout = setTimeout(() => {
        context.timeoutPhase = phase
        controller.abort(new Error(`AI provider ${phase} timeout`))
      }, milliseconds)
    }
    context.clearPhaseTimeout = () => {
      if (phaseTimeout) clearTimeout(phaseTimeout)
      phaseTimeout = undefined
    }
    context.cleanup = () => {
      context.clearPhaseTimeout()
      clearTimeout(totalTimeout)
      externalSignal?.removeEventListener('abort', forwardAbort)
    }
    return context
  }

  private normalizeError(error: unknown, abort: AbortContext): AiProviderRequestError {
    if (error instanceof AiProviderRequestError) return error
    if (abort.timeoutPhase) {
      return new AiProviderRequestError(
        `AI provider request timed out during ${abort.timeoutPhase}`,
        undefined,
        undefined,
        'timeout'
      )
    }
    if (abort.externalSignal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
      return new AiProviderRequestError(
        'AI provider request was aborted',
        undefined,
        undefined,
        'aborted'
      )
    }
    return new AiProviderRequestError('AI provider request failed', undefined, undefined, 'network')
  }
}
