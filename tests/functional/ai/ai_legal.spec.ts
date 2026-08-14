import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

import AiAnalysis from '#modules/ai/models/ai_analysis'
import AiAnalysisRepository from '#modules/ai/repositories/ai_analysis_repository'
import AiKnowledgeRepository from '#modules/ai/repositories/ai_knowledge_repository'
import AiLegalService from '#modules/ai/services/ai_legal_service'
import AiProviderFactory from '#modules/ai/services/ai_provider_factory'
import DocumentContentService from '#modules/ai/services/document_content_service'
import LegalAiPromptBuilder from '#modules/ai/services/legal_ai_prompt_builder'
import Client from '#modules/clients/models/client'
import LegalDocument from '#modules/documents/models/legal_document'
import File from '#modules/files/models/file'
import Folder from '#modules/folders/models/folder'
import type {
  AiProvider,
  AiProviderMessage,
  AiProviderResult,
} from '#modules/ai/interfaces/ai_interface'
import { createLegalAdmin } from '#tests/helpers/legal_context'

class LegalProvider implements AiProvider {
  readonly name = 'test-provider'
  readonly model = 'test-legal-model'
  readonly calls: AiProviderMessage[][] = []

  async generate(messages: AiProviderMessage[]): Promise<AiProviderResult> {
    this.calls.push(messages)
    const prompt = messages.at(-1)?.content ?? ''
    let content = 'Documento jurídico gerado'
    if (prompt.includes('"parties"')) {
      content = JSON.stringify({
        parties: [{ name: 'Maria', type: 'pessoa física', document: null }],
        dates: [{ date: '2026-08-14', description: 'Vencimento' }],
        values: [{ amount: 1250, currency: 'BRL', description: 'Principal' }],
        locations: ['São Paulo'],
        legal_terms: ['prescrição'],
      })
    } else if (prompt.includes('Confidence deve')) {
      content = JSON.stringify({
        type: 'contrato',
        confidence: 92,
        reason: 'Cláusulas contratuais',
      })
    } else if (prompt.includes('payment_probability')) {
      content = JSON.stringify({
        payment_probability: 72,
        estimated_date: null,
        risk_factors: ['Orçamento não confirmado'],
        recommendations: ['Atualizar cálculo'],
        reasoning_summary: 'Estimativa condicionada aos dados fornecidos.',
      })
    } else if (prompt.includes('resumo executivo')) {
      content = 'Resumo jurídico baseado no documento.'
    }

    return {
      content,
      provider: this.name,
      model: this.model,
      usage: { total_tokens: 10 },
    }
  }

  async *stream(): AsyncGenerator<never, void, void> {}
}

function legalService(provider: AiProvider): AiLegalService {
  return new AiLegalService(
    new AiAnalysisRepository(),
    new AiKnowledgeRepository(),
    AiProviderFactory.forProvider(provider),
    new DocumentContentService(),
    new LegalAiPromptBuilder()
  )
}

test.group('Legal AI services', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('ports generation, structured extraction, classification and usage history', async ({
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin(2)
    const provider = new LegalProvider()
    const service = legalService(provider)

    const generated = await service.generateDocument(tenants[0].id, user.id, {
      template_type: 'contract',
      variables: { type: 'prestação de serviços', party: 'Maria' },
    })
    const entities = await service.extractEntities(tenants[0].id, user.id, {
      text: 'Maria deverá pagar R$ 1.250,00 em 14 de agosto de 2026 em São Paulo.',
    })
    const classification = await service.classifyDocument(tenants[0].id, user.id, {
      text: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS celebrado entre as partes identificadas.',
    })

    assert.equal(generated.content, 'Documento jurídico gerado')
    assert.isNumber(generated.analysis_id)
    assert.deepEqual(entities.parties, [{ name: 'Maria', type: 'pessoa física', document: null }])
    assert.equal(classification.type, 'contrato')
    assert.equal(classification.confidence, 0.92)

    const history = await service.history(tenants[0].id, user.id, {})
    assert.lengthOf(history.data, 3)
    assert.includeMembers(
      history.data.map((analysis) => analysis.analysis_type),
      ['generation', 'entities', 'classification']
    )
    assert.equal(history.data[0].tenant_id, tenants[0].id)
    assert.equal(history.data[0].provider, provider.name)
    assert.equal(history.data[0].model, provider.model)

    const stats = await service.usageStats(tenants[0].id, user.id)
    assert.equal(stats.total_analyses, 3)
    assert.equal(stats.tokens_used, 30)

    const otherTenantStats = await service.usageStats(tenants[1].id, user.id)
    assert.equal(otherTenantStats.total_analyses, 0)
  })

  test('analyzes only documents from the selected tenant and records source metadata', async ({
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin(2)
    const suffix = randomUUID()
    const legalClient = await Client.create({
      tenant_id: tenants[0].id,
      name: 'Cliente AI',
      document: '52998224725',
      person_type: 'individual',
      metadata: {},
    })
    const folder = await Folder.create({
      tenant_id: tenants[0].id,
      code: `AI-${suffix.toUpperCase()}`,
      title: 'Caso AI',
      description: 'Pasta para análise',
      status: 'active',
      area: 'Cível',
      client_id: legalClient.id,
      metadata: {},
    })
    const file = await File.create({
      tenant_id: tenants[0].id,
      owner_id: user.id,
      client_name: 'peticao-inicial',
      file_name: `tests/missing-${suffix}.txt`,
      file_size: 100,
      file_type: 'text/plain',
      file_category: 'document',
      storage_disk: 'fs',
    })
    const document = await LegalDocument.create({
      tenant_id: tenants[0].id,
      folder_id: folder.id,
      process_id: null,
      file_id: file.id,
      created_by: user.id,
      document_type: 'petition',
      title: 'Petição inicial',
      description: 'Pedido de cobrança com vencimento comprovado.',
      version: 1,
      is_signed: false,
      metadata: {},
    })
    const service = legalService(new LegalProvider())

    const analysis = await service.analyzeDocument(tenants[0].id, user.id, {
      document_id: document.id,
      analysis_type: 'summary',
    })

    assert.equal(analysis.document_id, document.id)
    assert.equal(analysis.folder_id, folder.id)
    assert.equal(analysis.tenant_id, tenants[0].id)
    assert.equal(analysis.result.content, 'Resumo jurídico baseado no documento.')
    assert.deepEqual(analysis.metadata.extraction_warnings, ['file_content_unavailable'])

    await assert.rejects(
      () =>
        service.analyzeDocument(tenants[1].id, user.id, {
          document_id: document.id,
          analysis_type: 'summary',
        }),
      'Legal document not found'
    )
  })

  test('analyzes precatorio folders using the normalized matter_type metadata', async ({
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const suffix = randomUUID()
    const legalClient = await Client.create({
      tenant_id: tenants[0].id,
      name: 'Ente público',
      document: '11222333000181',
      person_type: 'company',
      metadata: {},
    })
    const folder = await Folder.create({
      tenant_id: tenants[0].id,
      code: `PREC-${suffix.toUpperCase()}`,
      title: 'Precatório alimentar',
      description: 'Beneficiário prioritário',
      status: 'active',
      area: 'Administrativo',
      subarea: 'Precatórios',
      client_id: legalClient.id,
      metadata: { matter_type: 'precatorio', chronological_order: 18 },
    })

    const result = await legalService(new LegalProvider()).analyzePrecatorio(
      tenants[0].id,
      user.id,
      { folder_id: folder.id }
    )

    assert.equal(result.payment_probability, 72)
    assert.deepEqual(result.recommendations, ['Atualizar cálculo'])
    const analysis = await AiAnalysis.query()
      .where('tenant_id', tenants[0].id)
      .where('folder_id', folder.id)
      .firstOrFail()
    assert.equal(analysis.analysis_type, 'precatorio')
  })
})
