import logger from '@adonisjs/core/services/logger'

import { AiProviderRequestError } from '#modules/ai/providers/openai_compatible_provider'
import type {
  AiGenerationOptions,
  AiProfile,
  AiProvider,
  AiProviderChunk,
  AiProviderMessage,
  AiProviderResult,
} from '#modules/ai/interfaces/ai_interface'

interface CircuitState {
  failures: number
  openUntil: number
}

export interface RoutedAiProviderOptions {
  profile: AiProfile
  candidates: AiProvider[]
  maxAttemptsPerCandidate: number
  baseDelayMs: number
  circuitFailureThreshold: number
  circuitResetMs: number
  random?: () => number
}

const circuitStates = new Map<string, CircuitState>()

export function resetAiCircuitBreakers(): void {
  circuitStates.clear()
}

export default class RoutedAiProvider implements AiProvider {
  readonly name = 'multi'
  readonly model: string

  constructor(private readonly options: RoutedAiProviderOptions) {
    if (!options.candidates.length) throw new Error('AI routing requires at least one candidate')
    this.model = `profile:${options.profile}`
  }

  async generate(
    messages: AiProviderMessage[],
    signal?: AbortSignal,
    options?: AiGenerationOptions
  ): Promise<AiProviderResult> {
    let lastError: unknown

    for (const [candidateIndex, candidate] of this.options.candidates.entries()) {
      if (this.isCircuitOpen(candidate)) continue

      for (let attempt = 1; attempt <= this.options.maxAttemptsPerCandidate; attempt++) {
        const startedAt = performance.now()
        try {
          const result = await candidate.generate(messages, signal, options)
          const durationMs = Math.round(performance.now() - startedAt)
          this.recordSuccess(candidate)
          this.logSuccess(candidate, attempt, candidateIndex, durationMs, false)
          return {
            ...result,
            usage: this.withRoutingMetadata(
              result.usage,
              candidate,
              attempt,
              candidateIndex,
              durationMs
            ),
          }
        } catch (error) {
          lastError = error
          const durationMs = Math.round(performance.now() - startedAt)
          const retryable = this.isRetryable(error)
          this.recordFailure(candidate, retryable || this.isProviderLevelFailure(error))
          this.logFailure(candidate, attempt, candidateIndex, durationMs, error, false)

          if (this.isFatal(error)) throw error
          // Retrying a permanent rejection just repeats it; hand over to the
          // next candidate instead of burning the attempt budget here.
          if (!retryable) break
          if (attempt < this.options.maxAttemptsPerCandidate) {
            await this.backoff(attempt, signal)
          }
        }
      }
    }

    throw (
      lastError ??
      new AiProviderRequestError('All AI providers are unavailable', 503, undefined, 'http')
    )
  }

  async *stream(
    messages: AiProviderMessage[],
    signal?: AbortSignal,
    options?: AiGenerationOptions
  ): AsyncGenerator<AiProviderChunk, void, void> {
    let lastError: unknown

    for (const [candidateIndex, candidate] of this.options.candidates.entries()) {
      if (this.isCircuitOpen(candidate)) continue

      for (let attempt = 1; attempt <= this.options.maxAttemptsPerCandidate; attempt++) {
        const startedAt = performance.now()
        let emittedContent = false
        let usage: Record<string, unknown> = {}

        try {
          for await (const chunk of candidate.stream(messages, signal, options)) {
            if (chunk.usage) usage = chunk.usage
            if (!chunk.content) continue
            emittedContent = true
            yield {
              content: chunk.content,
              provider: candidate.name,
              model: candidate.model,
            }
          }

          if (!emittedContent) {
            throw new AiProviderRequestError('AI provider returned empty stream content')
          }

          const durationMs = Math.round(performance.now() - startedAt)
          this.recordSuccess(candidate)
          this.logSuccess(candidate, attempt, candidateIndex, durationMs, true)
          yield {
            content: '',
            provider: candidate.name,
            model: candidate.model,
            usage: this.withRoutingMetadata(usage, candidate, attempt, candidateIndex, durationMs),
          }
          return
        } catch (error) {
          lastError = error
          const durationMs = Math.round(performance.now() - startedAt)
          const retryable = this.isRetryable(error)
          this.recordFailure(candidate, retryable || this.isProviderLevelFailure(error))
          this.logFailure(candidate, attempt, candidateIndex, durationMs, error, true)

          // Never splice output from two legal models into one streamed answer.
          if (emittedContent || this.isFatal(error)) throw error
          if (!retryable) break
          if (attempt < this.options.maxAttemptsPerCandidate) {
            await this.backoff(attempt, signal)
          }
        }
      }
    }

    throw (
      lastError ??
      new AiProviderRequestError('All AI providers are unavailable', 503, undefined, 'http')
    )
  }

  private circuitKey(provider: AiProvider): string {
    return `${provider.name}:${provider.model}`
  }

  private isCircuitOpen(provider: AiProvider): boolean {
    const key = this.circuitKey(provider)
    const state = circuitStates.get(key)
    if (!state || state.openUntil <= 0) return false
    if (state.openUntil <= Date.now()) {
      circuitStates.set(key, { failures: 0, openUntil: 0 })
      return false
    }

    logger.warn(
      { provider: provider.name, model: provider.model, openUntil: state.openUntil },
      'Skipping AI provider with an open circuit'
    )
    return true
  }

  private recordSuccess(provider: AiProvider): void {
    circuitStates.set(this.circuitKey(provider), { failures: 0, openUntil: 0 })
  }

  private recordFailure(provider: AiProvider, countsTowardCircuit: boolean): void {
    if (!countsTowardCircuit) return
    const key = this.circuitKey(provider)
    const state = circuitStates.get(key) ?? { failures: 0, openUntil: 0 }
    const failures = state.failures + 1
    circuitStates.set(key, {
      failures,
      openUntil:
        failures >= this.options.circuitFailureThreshold
          ? Date.now() + this.options.circuitResetMs
          : 0,
    })
  }

  private isRetryable(error: unknown): boolean {
    return error instanceof AiProviderRequestError && error.retryable
  }

  /**
   * A cancelled request is the only failure worth giving up on: the caller is
   * already gone, so burning the remaining providers helps nobody.
   *
   * Everything else moves on to the next candidate — that is the whole point of
   * a candidate list. Treating a permanent rejection as fatal meant one broken
   * account (delinquent billing answers 400) took down a profile whose other
   * provider was healthy.
   */
  private isFatal(error: unknown): boolean {
    return error instanceof AiProviderRequestError && error.code === 'aborted'
  }

  /**
   * Auth, billing and missing-model rejections describe the account rather than
   * the request, so they will greet every later call the same way. Counting them
   * lets the breaker park the provider instead of paying a round trip per turn.
   */
  private isProviderLevelFailure(error: unknown): boolean {
    if (!(error instanceof AiProviderRequestError)) return false
    if (error.code !== 'http' || !error.status) return false
    return [401, 402, 403, 404].includes(error.status)
  }

  private async backoff(attempt: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new AiProviderRequestError(
        'AI provider request was aborted',
        undefined,
        undefined,
        'aborted'
      )
    }

    const random = this.options.random ?? Math.random
    const exponentialMs = this.options.baseDelayMs * 2 ** (attempt - 1)
    const delayMs = Math.round(exponentialMs * (0.75 + random() * 0.5))
    if (delayMs <= 0) return

    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timeout)
        signal?.removeEventListener('abort', abort)
        reject(
          new AiProviderRequestError(
            'AI provider request was aborted',
            undefined,
            undefined,
            'aborted'
          )
        )
      }
      const timeout = setTimeout(() => {
        signal?.removeEventListener('abort', abort)
        resolve()
      }, delayMs)
      signal?.addEventListener('abort', abort, { once: true })
    })
  }

  private withRoutingMetadata(
    usage: Record<string, unknown>,
    provider: AiProvider,
    attempt: number,
    candidateIndex: number,
    durationMs: number
  ): Record<string, unknown> {
    return {
      ...usage,
      routing: {
        profile: this.options.profile,
        provider: provider.name,
        model: provider.model,
        attempt,
        fallback_used: candidateIndex > 0,
        duration_ms: durationMs,
      },
    }
  }

  private logSuccess(
    provider: AiProvider,
    attempt: number,
    candidateIndex: number,
    durationMs: number,
    streaming: boolean
  ): void {
    logger.info(
      {
        profile: this.options.profile,
        provider: provider.name,
        model: provider.model,
        attempt,
        fallback: candidateIndex > 0,
        durationMs,
        streaming,
      },
      'AI provider request completed'
    )
  }

  private logFailure(
    provider: AiProvider,
    attempt: number,
    candidateIndex: number,
    durationMs: number,
    error: unknown,
    streaming: boolean
  ): void {
    logger.warn(
      {
        profile: this.options.profile,
        provider: provider.name,
        model: provider.model,
        attempt,
        fallback: candidateIndex > 0,
        durationMs,
        streaming,
        errorCode: error instanceof AiProviderRequestError ? error.code : 'unknown',
        status: error instanceof AiProviderRequestError ? error.status : undefined,
        requestId: error instanceof AiProviderRequestError ? error.requestId : undefined,
      },
      'AI provider request failed'
    )
  }
}
