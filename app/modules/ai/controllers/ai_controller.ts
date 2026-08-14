import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import { requireTenantId } from '#shared/http/tenant_context'
import AiLegalService from '#modules/ai/services/ai_legal_service'
import AiSemanticSearchService from '#modules/ai/services/ai_semantic_search_service'
import {
  aiAnalysisHistoryValidator,
  analyzeDocumentValidator,
  analyzePrecatorioValidator,
  generateDocumentValidator,
  semanticSearchValidator,
  textOrDocumentValidator,
} from '#modules/ai/validators/ai_validators'

export default class AiController {
  async analyzeDocument(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(analyzeDocumentValidator)
    const service = await app.container.make(AiLegalService)
    const data = await service.analyzeDocument(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id,
      input
    )
    return ctx.response.ok({ message: 'Document analyzed successfully', data })
  }

  async generateDocument(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(generateDocumentValidator)
    const service = await app.container.make(AiLegalService)
    const data = await service.generateDocument(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id,
      input
    )
    return ctx.response.ok({ message: 'Document generated successfully', data })
  }

  async semanticSearch(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(semanticSearchValidator)
    const service = await app.container.make(AiSemanticSearchService)
    const data = await service.search(requireTenantId(ctx), input)
    return ctx.response.ok({ message: 'Search completed successfully', data })
  }

  async extractEntities(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(textOrDocumentValidator)
    const service = await app.container.make(AiLegalService)
    const data = await service.extractEntities(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id,
      input
    )
    return ctx.response.ok({ message: 'Entities extracted successfully', data })
  }

  async classifyDocument(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(textOrDocumentValidator)
    const service = await app.container.make(AiLegalService)
    const data = await service.classifyDocument(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id,
      input
    )
    return ctx.response.ok({ message: 'Document classified successfully', data })
  }

  async analyzePrecatorio(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(analyzePrecatorioValidator)
    const service = await app.container.make(AiLegalService)
    const data = await service.analyzePrecatorio(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id,
      input
    )
    return ctx.response.ok({ message: 'Precatorio analyzed successfully', data })
  }

  async history(ctx: HttpContext) {
    const input = await aiAnalysisHistoryValidator.validate(ctx.request.qs())
    const service = await app.container.make(AiLegalService)
    return ctx.response.ok(
      await service.history(requireTenantId(ctx), ctx.auth.getUserOrFail().id, input)
    )
  }

  async usageStats(ctx: HttpContext) {
    const service = await app.container.make(AiLegalService)
    const data = await service.usageStats(requireTenantId(ctx), ctx.auth.getUserOrFail().id)
    return ctx.response.ok({ message: 'Usage statistics retrieved', data })
  }
}
