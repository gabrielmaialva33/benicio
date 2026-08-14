import aiConfig from '#config/ai'
import ServiceUnavailableException from '#exceptions/service_unavailable_exception'
import OpenAiCompatibleProvider from '#modules/ai/providers/openai_compatible_provider'
import RoutedAiProvider from '#modules/ai/providers/routed_ai_provider'
import type { AiProfile, AiProvider } from '#modules/ai/interfaces/ai_interface'

export default class AiProviderFactory {
  private overrideProvider?: AiProvider
  private readonly routedProviders = new Map<AiProfile, AiProvider>()

  static forProvider(provider: AiProvider): AiProviderFactory {
    const factory = new AiProviderFactory()
    factory.overrideProvider = provider
    return factory
  }

  getOrFail(profile: AiProfile = aiConfig.defaultProfile): AiProvider {
    if (this.overrideProvider) return this.overrideProvider
    if (aiConfig.provider === 'disabled') {
      throw new ServiceUnavailableException('AI provider is disabled')
    }
    if (aiConfig.provider === 'openai_compatible') return this.legacyProvider()

    const cached = this.routedProviders.get(profile)
    if (cached) return cached

    const candidates = aiConfig.profiles[profile].candidates
      .filter((candidate) => candidate.apiKey?.trim())
      .map(
        (candidate) =>
          new OpenAiCompatibleProvider({
            providerName: candidate.provider,
            baseUrl: candidate.baseUrl,
            apiKey: candidate.apiKey,
            model: candidate.model,
            maxTokens: candidate.maxTokens,
            timeouts: candidate.timeouts,
          })
      )
    if (!candidates.length) {
      throw new ServiceUnavailableException('No AI provider is configured for this profile')
    }

    const routed = new RoutedAiProvider({
      profile,
      candidates,
      ...aiConfig.routing,
    })
    this.routedProviders.set(profile, routed)
    return routed
  }

  isAvailable(profile: AiProfile = aiConfig.defaultProfile): boolean {
    try {
      this.getOrFail(profile)
      return true
    } catch (error) {
      if (error instanceof ServiceUnavailableException) return false
      throw error
    }
  }

  private legacyProvider(): AiProvider {
    const { baseUrl, apiKey, model, timeoutMs } = aiConfig.legacy
    if (!baseUrl?.trim() || !model?.trim()) {
      throw new ServiceUnavailableException('AI provider is not fully configured')
    }

    try {
      return new OpenAiCompatibleProvider({
        baseUrl: baseUrl.trim(),
        apiKey,
        model: model.trim(),
        timeoutMs,
      })
    } catch {
      throw new ServiceUnavailableException('AI provider configuration is invalid')
    }
  }
}
