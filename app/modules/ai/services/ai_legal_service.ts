import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

import aiConfig from '#config/ai'
import BadGatewayException from '#exceptions/bad_gateway_exception'
import BadRequestException from '#exceptions/bad_request_exception'
import NotFoundException from '#exceptions/not_found_exception'
import AiAnalysisRepository from '#modules/ai/repositories/ai_analysis_repository'
import AiKnowledgeRepository from '#modules/ai/repositories/ai_knowledge_repository'
import AiProviderFactory from '#modules/ai/services/ai_provider_factory'
import DocumentContentService from '#modules/ai/services/document_content_service'
import LegalAiPromptBuilder from '#modules/ai/services/legal_ai_prompt_builder'
import { AiProviderRequestError } from '#modules/ai/providers/openai_compatible_provider'
import type AiAnalysis from '#modules/ai/models/ai_analysis'
import type {
  AiAnalysisHistoryInput,
  AiAnalysisType,
  AiDocumentSource,
  AiLegalOptions,
  AiProfile,
  AiProviderMessage,
  AiProviderResult,
  AnalyzeDocumentInput,
  AnalyzePrecatorioInput,
  GenerateDocumentInput,
  TextOrDocumentInput,
} from '#modules/ai/interfaces/ai_interface'

interface TrackedGenerationInput {
  tenantId: number
  userId: number
  analysisType: AiAnalysisType
  profile: AiProfile
  messages: AiProviderMessage[]
  options?: AiLegalOptions
  documentId?: number
  folderId?: number
  metadata?: Record<string, unknown>
  buildResult(content: string, providerResult: AiProviderResult): Record<string, unknown>
}

interface ResolvedLegalText {
  content: string
  documentId?: number
  folderId?: number
  metadata: Record<string, unknown>
}

class AiStructuredOutputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiStructuredOutputError'
  }
}

@inject()
export default class AiLegalService {
  constructor(
    private readonly analysisRepository: AiAnalysisRepository,
    private readonly knowledgeRepository: AiKnowledgeRepository,
    private readonly providerFactory: AiProviderFactory,
    private readonly contentService: DocumentContentService,
    private readonly prompts: LegalAiPromptBuilder
  ) {}

  async analyzeDocument(tenantId: number, userId: number, input: AnalyzeDocumentInput) {
    const source = await this.knowledgeRepository.findSource(tenantId, input.document_id)
    if (!source) throw new NotFoundException('Legal document not found')
    const resolved = await this.sourceText(source)
    const profile =
      input.options?.profile ?? (input.analysis_type === 'legal_review' ? 'deep' : 'fast')
    const language = input.options?.language ?? 'pt-BR'

    const { analysis } = await this.trackedGeneration({
      tenantId,
      userId,
      documentId: source.id,
      folderId: source.folder_id,
      analysisType: input.analysis_type,
      profile,
      options: input.options,
      metadata: { ...resolved.metadata, language },
      messages: [
        { role: 'system', content: this.prompts.system('análise de documento jurídico') },
        {
          role: 'user',
          content: this.prompts.analyzeDocument(resolved.content, input.analysis_type, language),
        },
      ],
      buildResult: (content, result) => ({
        content,
        tokens_used: this.tokensUsed(result),
        metadata: {
          language,
          prompt_version: aiConfig.promptVersion,
          input_truncated: resolved.metadata.input_truncated,
        },
      }),
    })
    return analysis
  }

  async generateDocument(tenantId: number, userId: number, input: GenerateDocumentInput) {
    const profile = input.options?.profile ?? 'deep'
    const language = input.options?.language ?? 'pt-BR'
    const { analysis, result } = await this.trackedGeneration({
      tenantId,
      userId,
      analysisType: 'generation',
      profile,
      options: input.options,
      metadata: { operation: 'document_generation', template_type: input.template_type, language },
      messages: [
        { role: 'system', content: this.prompts.system('redação de documento jurídico') },
        {
          role: 'user',
          content: this.prompts.generateDocument(input.template_type, input.variables, language),
        },
      ],
      buildResult: (content) => ({
        template_type: input.template_type,
        generated_content: content,
        variables: input.variables,
      }),
    })

    return {
      content: String(result.generated_content),
      analysis_id: analysis.id,
    }
  }

  async extractEntities(tenantId: number, userId: number, input: TextOrDocumentInput) {
    const resolved = await this.resolveText(tenantId, input)
    const { result } = await this.trackedGeneration({
      tenantId,
      userId,
      documentId: resolved.documentId,
      folderId: resolved.folderId,
      analysisType: 'entities',
      profile: 'fast',
      metadata: resolved.metadata,
      options: { temperature: 0, maxTokens: 2_000 },
      messages: [
        { role: 'system', content: this.prompts.system('extração estruturada de entidades') },
        { role: 'user', content: this.prompts.extractEntities(resolved.content) },
      ],
      buildResult: (content) => this.normalizeEntities(this.parseJsonObject(content)),
    })
    return result
  }

  async classifyDocument(tenantId: number, userId: number, input: TextOrDocumentInput) {
    const resolved = await this.resolveText(tenantId, input)
    const { result } = await this.trackedGeneration({
      tenantId,
      userId,
      documentId: resolved.documentId,
      folderId: resolved.folderId,
      analysisType: 'classification',
      profile: 'fast',
      metadata: resolved.metadata,
      options: { temperature: 0, maxTokens: 512 },
      messages: [
        { role: 'system', content: this.prompts.system('classificação de documento jurídico') },
        { role: 'user', content: this.prompts.classifyDocument(resolved.content) },
      ],
      buildResult: (content) => this.normalizeClassification(this.parseJsonObject(content)),
    })
    return result
  }

  async analyzePrecatorio(tenantId: number, userId: number, input: AnalyzePrecatorioInput) {
    const folder = await this.analysisRepository.findPrecatorioFolder(tenantId, input.folder_id)
    if (!folder) throw new NotFoundException('Precatorio folder not found')
    const profile = input.options?.profile ?? 'deep'
    const { result } = await this.trackedGeneration({
      tenantId,
      userId,
      folderId: folder.id,
      analysisType: 'precatorio',
      profile,
      options: input.options,
      metadata: { matter_type: 'precatorio' },
      messages: [
        { role: 'system', content: this.prompts.system('análise de precatório') },
        {
          role: 'user',
          content: this.prompts.analyzePrecatorio({
            code: folder.code,
            title: folder.title,
            description: folder.description,
            area: folder.area,
            subarea: folder.subarea,
            metadata: folder.metadata,
          }),
        },
      ],
      buildResult: (content) => this.normalizePrecatorio(this.parseJsonObject(content)),
    })
    return result
  }

  async history(tenantId: number, userId: number, input: AiAnalysisHistoryInput) {
    const analyses = await this.analysisRepository.paginate(tenantId, userId, input)
    return { data: analyses.all(), meta: analyses.getMeta() }
  }

  async usageStats(tenantId: number, userId: number) {
    const usage = await this.analysisRepository.usageSince(
      tenantId,
      userId,
      DateTime.now().minus({ days: 30 })
    )
    return {
      period: '30_days',
      total_analyses: usage.total,
      by_type: usage.byType,
      tokens_used: usage.byType.reduce((sum, row) => sum + row.total_tokens, 0),
    }
  }

  private async trackedGeneration(input: TrackedGenerationInput): Promise<{
    analysis: AiAnalysis
    result: Record<string, unknown>
  }> {
    const provider = this.providerFactory.getOrFail(input.profile, input.options?.model)
    const analysis = await this.analysisRepository.begin({
      tenantId: input.tenantId,
      userId: input.userId,
      analysisType: input.analysisType,
      profile: input.profile,
      documentId: input.documentId,
      folderId: input.folderId,
      metadata: {
        ...input.metadata,
        prompt_version: aiConfig.promptVersion,
        requested_model: input.options?.model ?? null,
      },
    })
    const startedAt = performance.now()

    let providerResult: AiProviderResult
    try {
      providerResult = await provider.generate(input.messages, undefined, input.options)
    } catch (error) {
      await this.failAnalysis(analysis, error, startedAt, 'provider_request_failed')
      throw new BadGatewayException('AI provider request failed')
    }

    let result: Record<string, unknown>
    try {
      result = input.buildResult(providerResult.content, providerResult)
    } catch (error) {
      await this.failAnalysis(analysis, error, startedAt, 'invalid_structured_output')
      throw new BadGatewayException('AI provider returned invalid structured output')
    }

    const completed = await this.analysisRepository.complete(analysis, {
      result,
      provider: providerResult.provider,
      model: providerResult.model,
      tokensUsed: this.tokensUsed(providerResult),
      processingTimeMs: Math.max(0, Math.round(performance.now() - startedAt)),
      metadata: { provider_usage: providerResult.usage },
    })
    return { analysis: completed, result }
  }

  private async failAnalysis(
    analysis: AiAnalysis,
    error: unknown,
    startedAt: number,
    code: string
  ): Promise<void> {
    logger.error(
      {
        analysisId: analysis.id,
        tenantId: analysis.tenant_id,
        errorName: error instanceof Error ? error.name : 'unknown',
        errorCode: error instanceof AiProviderRequestError ? error.code : code,
        status: error instanceof AiProviderRequestError ? error.status : undefined,
        requestId: error instanceof AiProviderRequestError ? error.requestId : undefined,
      },
      'Tracked legal AI operation failed'
    )
    try {
      await this.analysisRepository.fail(
        analysis,
        { code },
        Math.max(0, Math.round(performance.now() - startedAt))
      )
    } catch (stateError) {
      logger.error(
        { err: stateError, analysisId: analysis.id },
        'Failed to persist legal AI error state'
      )
    }
  }

  private async resolveText(
    tenantId: number,
    input: TextOrDocumentInput
  ): Promise<ResolvedLegalText> {
    if (input.document_id) {
      const source = await this.knowledgeRepository.findSource(tenantId, input.document_id)
      if (!source) throw new NotFoundException('Legal document not found')
      const resolved = await this.sourceText(source)
      return {
        ...resolved,
        documentId: source.id,
        folderId: source.folder_id,
      }
    }
    if (!input.text?.trim()) throw new BadRequestException('Either text or document_id is required')

    const text = input.text.trim()
    const content = text.slice(0, aiConfig.maxContextChars)
    return {
      content,
      metadata: {
        input_source: 'text',
        input_truncated: content.length < text.length,
      },
    }
  }

  private async sourceText(source: AiDocumentSource) {
    const extracted = await this.contentService.extract(source)
    const fullContent = [
      `Título: ${source.title}`,
      source.description ? `Descrição: ${source.description}` : '',
      extracted.text ? `Conteúdo:\n${extracted.text}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')
    const content = fullContent.slice(0, aiConfig.maxContextChars)
    return {
      content,
      metadata: {
        input_source: extracted.origin,
        extraction_warnings: extracted.warnings,
        input_truncated: extracted.truncated || content.length < fullContent.length,
      },
    }
  }

  private tokensUsed(result: AiProviderResult): number | null {
    const value = result.usage.total_tokens
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.round(value)
    if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
    return null
  }

  private parseJsonObject(content: string): Record<string, unknown> {
    const trimmed = content.trim()
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
    const raw = fenced?.[1] ?? trimmed.slice(trimmed.indexOf('{'), trimmed.lastIndexOf('}') + 1)
    try {
      const parsed = JSON.parse(raw) as unknown
      if (!this.isRecord(parsed)) throw new Error('not an object')
      return parsed
    } catch {
      throw new AiStructuredOutputError('AI response is not a valid JSON object')
    }
  }

  private normalizeEntities(value: Record<string, unknown>): Record<string, unknown> {
    const parties = this.recordArray(value.parties, 'parties').map((party) => ({
      name: this.requiredString(party.name, 'parties.name'),
      type: this.requiredString(party.type, 'parties.type'),
      document:
        party.document === null || party.document === undefined
          ? null
          : this.requiredString(party.document, 'parties.document'),
    }))
    const dates = this.recordArray(value.dates, 'dates').map((date) => ({
      date: this.requiredString(date.date, 'dates.date'),
      description: this.requiredString(date.description, 'dates.description'),
    }))
    const values = this.recordArray(value.values, 'values').map((amount) => ({
      amount: this.requiredNumber(amount.amount, 'values.amount'),
      currency: this.requiredString(amount.currency, 'values.currency'),
      description: this.requiredString(amount.description, 'values.description'),
    }))
    return {
      parties,
      dates,
      values,
      locations: this.stringArray(value.locations, 'locations'),
      legal_terms: this.stringArray(value.legal_terms, 'legal_terms'),
    }
  }

  private normalizeClassification(value: Record<string, unknown>): Record<string, unknown> {
    let confidence = this.requiredNumber(value.confidence, 'confidence')
    if (confidence > 1 && confidence <= 100) confidence /= 100
    if (confidence < 0 || confidence > 1) {
      throw new AiStructuredOutputError('classification.confidence must be between 0 and 1')
    }
    return {
      type: this.requiredString(value.type, 'type'),
      confidence,
      ...(typeof value.reason === 'string' && value.reason.trim()
        ? { reason: value.reason.trim() }
        : {}),
    }
  }

  private normalizePrecatorio(value: Record<string, unknown>): Record<string, unknown> {
    const probability = this.requiredNumber(value.payment_probability, 'payment_probability')
    if (probability < 0 || probability > 100) {
      throw new AiStructuredOutputError('payment_probability must be between 0 and 100')
    }
    const estimatedDate = value.estimated_date
    if (estimatedDate !== null && typeof estimatedDate !== 'string') {
      throw new AiStructuredOutputError('estimated_date must be a string or null')
    }
    return {
      payment_probability: probability,
      estimated_date: estimatedDate,
      risk_factors: this.stringArray(value.risk_factors, 'risk_factors'),
      recommendations: this.stringArray(value.recommendations, 'recommendations'),
      ...(typeof value.reasoning_summary === 'string' && value.reasoning_summary.trim()
        ? { reasoning_summary: value.reasoning_summary.trim() }
        : {}),
    }
  }

  private recordArray(value: unknown, path: string): Record<string, unknown>[] {
    if (!Array.isArray(value) || value.some((item) => !this.isRecord(item))) {
      throw new AiStructuredOutputError(`${path} must be an array of objects`)
    }
    return value as Record<string, unknown>[]
  }

  private stringArray(value: unknown, path: string): string[] {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
      throw new AiStructuredOutputError(`${path} must be an array of strings`)
    }
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  private requiredString(value: unknown, path: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new AiStructuredOutputError(`${path} must be a non-empty string`)
    }
    return value.trim()
  }

  private requiredNumber(value: unknown, path: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new AiStructuredOutputError(`${path} must be a finite number`)
    }
    return value
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
}
