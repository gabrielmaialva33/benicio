import env from '#start/env'
import ServiceUnavailableException from '#exceptions/service_unavailable_exception'
import type { AiProvider } from '#modules/ai/interfaces/ai_interface'
import OpenAiCompatibleProvider from '#modules/ai/providers/openai_compatible_provider'

export default class AiProviderFactory {
  private overrideProvider?: AiProvider

  static forProvider(provider: AiProvider): AiProviderFactory {
    const factory = new AiProviderFactory()
    factory.overrideProvider = provider
    return factory
  }

  getOrFail(): AiProvider {
    if (this.overrideProvider) return this.overrideProvider

    const provider = env.get('AI_PROVIDER') ?? 'disabled'
    if (provider === 'disabled') {
      throw new ServiceUnavailableException('AI provider is disabled')
    }

    const baseUrl = env.get('AI_BASE_URL')
    const model = env.get('AI_MODEL')
    if (!baseUrl || !model) {
      throw new ServiceUnavailableException('AI provider is not fully configured')
    }

    try {
      return new OpenAiCompatibleProvider({
        baseUrl,
        apiKey: env.get('AI_API_KEY'),
        model,
        timeoutMs: env.get('AI_TIMEOUT_MS') ?? 60_000,
      })
    } catch {
      throw new ServiceUnavailableException('AI provider configuration is invalid')
    }
  }
}
