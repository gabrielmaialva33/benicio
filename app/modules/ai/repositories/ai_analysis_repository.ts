import { DateTime } from 'luxon'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

import AiAnalysis from '#modules/ai/models/ai_analysis'
import Folder from '#modules/folders/models/folder'
import LegalDocument from '#modules/documents/models/legal_document'
import type {
  AiAnalysisHistoryInput,
  AiAnalysisType,
  AiProfile,
} from '#modules/ai/interfaces/ai_interface'

export interface BeginAnalysisData {
  tenantId: number
  userId: number
  analysisType: AiAnalysisType
  profile: AiProfile
  documentId?: number
  folderId?: number
  metadata?: Record<string, unknown>
}

export interface CompleteAnalysisData {
  result: Record<string, unknown>
  provider: string
  model: string
  tokensUsed: number | null
  processingTimeMs: number
  metadata?: Record<string, unknown>
}

export interface AiUsageByType {
  analysis_type: string
  count: number
  total_tokens: number
}

export default class AiAnalysisRepository {
  findDocument(tenantId: number, documentId: number): Promise<LegalDocument | null> {
    return LegalDocument.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where('id', documentId)
      .first()
  }

  findFolder(tenantId: number, folderId: number): Promise<Folder | null> {
    return Folder.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where('id', folderId)
      .first()
  }

  findPrecatorioFolder(tenantId: number, folderId: number): Promise<Folder | null> {
    return Folder.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where('id', folderId)
      .where((query) => {
        query
          .whereRaw(`metadata @> ?::jsonb`, [JSON.stringify({ type: 'precatorio' })])
          .orWhereRaw(`metadata @> ?::jsonb`, [JSON.stringify({ matter_type: 'precatorio' })])
      })
      .first()
  }

  begin(data: BeginAnalysisData): Promise<AiAnalysis> {
    return AiAnalysis.create({
      tenant_id: data.tenantId,
      user_id: data.userId,
      document_id: data.documentId ?? null,
      folder_id: data.folderId ?? null,
      analysis_type: data.analysisType,
      profile: data.profile,
      provider: null,
      model: null,
      status: 'processing',
      result: {},
      error: null,
      tokens_used: null,
      processing_time_ms: null,
      metadata: data.metadata ?? {},
      completed_at: null,
    })
  }

  async complete(analysis: AiAnalysis, data: CompleteAnalysisData): Promise<AiAnalysis> {
    analysis.merge({
      result: data.result,
      provider: data.provider,
      model: data.model,
      status: 'completed',
      error: null,
      tokens_used: data.tokensUsed,
      processing_time_ms: data.processingTimeMs,
      metadata: { ...analysis.metadata, ...data.metadata },
      completed_at: DateTime.now(),
    })
    await analysis.save()
    return analysis
  }

  async fail(
    analysis: AiAnalysis,
    error: Record<string, unknown>,
    processingTimeMs: number
  ): Promise<void> {
    analysis.merge({
      status: 'failed',
      error,
      processing_time_ms: processingTimeMs,
      completed_at: DateTime.now(),
    })
    await analysis.save()
  }

  paginate(
    tenantId: number,
    userId: number,
    input: AiAnalysisHistoryInput
  ): Promise<ModelPaginatorContract<AiAnalysis>> {
    const query = AiAnalysis.query()
      .where('tenant_id', tenantId)
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')

    if (input.type) query.where('analysis_type', input.type)
    if (input.status) query.where('status', input.status)

    return query.paginate(input.page ?? 1, input.limit ?? 20)
  }

  async usageSince(
    tenantId: number,
    userId: number,
    since: DateTime
  ): Promise<{ total: number; byType: AiUsageByType[] }> {
    const rows = await AiAnalysis.query()
      .where('tenant_id', tenantId)
      .where('user_id', userId)
      .where('created_at', '>=', since.toSQL()!)
      .select('analysis_type')
      .count('* as count')
      .sum('tokens_used as total_tokens')
      .groupBy('analysis_type')

    const byType = rows.map((row) => ({
      analysis_type: row.analysis_type,
      count: Number(row.$extras.count ?? 0),
      total_tokens: Number(row.$extras.total_tokens ?? 0),
    }))

    return {
      total: byType.reduce((sum, row) => sum + row.count, 0),
      byType,
    }
  }
}
