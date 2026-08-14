import { test } from '@japa/runner'

import type { AiDocumentSource } from '#modules/ai/interfaces/ai_interface'
import NvidiaRetrievalProvider from '#modules/ai/providers/nvidia_retrieval_provider'
import AiKnowledgeRepository from '#modules/ai/repositories/ai_knowledge_repository'
import AiVectorRepository from '#modules/ai/repositories/ai_vector_repository'
import AiDocumentIndexService from '#modules/ai/services/ai_document_index_service'
import DocumentContentService from '#modules/ai/services/document_content_service'

const source: AiDocumentSource = {
  id: 41,
  folder_id: 7,
  file_id: 13,
  title: 'Contrato social',
  description: 'Alteração do quadro societário.',
  metadata: { jurisdiction: 'SP' },
  updated_at: '2026-08-14T12:00:00.000Z',
  file_name: 'tenants/3/documents/contrato.txt',
  file_type: 'text/plain',
  file_size: 128,
  storage_disk: 'fs',
  file_updated_at: '2026-08-14T11:00:00.000Z',
}

function serviceWith(dependencies: {
  knowledge: Record<string, unknown>
  vector?: Record<string, unknown>
  retrieval?: Record<string, unknown>
  content?: Record<string, unknown>
}) {
  return new AiDocumentIndexService(
    dependencies.knowledge as unknown as AiKnowledgeRepository,
    (dependencies.vector ?? {}) as unknown as AiVectorRepository,
    {
      embeddingModel: 'nvidia/test-embed',
      embedMany: async () => [[1, 0, 0, 0]],
      ...dependencies.retrieval,
    } as unknown as NvidiaRetrievalProvider,
    {
      extract: async () => ({
        text: 'Cláusula primeira. O capital social será integralizado.',
        origin: 'file',
        warnings: [],
        truncated: false,
      }),
      ...dependencies.content,
    } as unknown as DocumentContentService
  )
}

test.group('AI document index service', () => {
  test('writes deterministic tenant-scoped points and skips an unchanged source', async ({
    assert,
  }) => {
    let storedSourceHash: string | undefined
    let storedChunks: Array<{ qdrantPointId: string; content: string }> = []
    let embeddedTexts: string[] = []
    let vectorWrites = 0
    let firstPointId: string | undefined

    const service = serviceWith({
      knowledge: {
        listSources: async () => [source],
        sourceHashes: async () =>
          storedSourceHash ? new Map([[source.id, storedSourceHash]]) : new Map(),
        replaceDocumentChunks: async (
          _tenantId: number,
          _source: AiDocumentSource,
          sourceHash: string,
          _embeddingModel: string,
          chunks: Array<{ qdrantPointId: string; content: string }>
        ) => {
          storedSourceHash = sourceHash
          storedChunks = chunks
        },
        markDocumentIndexed: async () => storedChunks.length,
      },
      vector: {
        replaceDocument: async (points: unknown[]) => {
          vectorWrites++
          assert.lengthOf(points, storedChunks.length)
        },
      },
      retrieval: {
        embedMany: async (texts: string[], inputType: string) => {
          embeddedTexts = texts
          assert.equal(inputType, 'passage')
          return texts.map(() => [1, 0, 0, 0])
        },
      },
    })

    assert.deepEqual(await service.indexScope(3), {
      scanned: 1,
      indexed: 1,
      unchanged: 0,
      failed: 0,
    })
    assert.lengthOf(storedChunks, 1)
    firstPointId = storedChunks[0].qdrantPointId
    assert.match(
      storedChunks[0].qdrantPointId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/
    )
    assert.include(embeddedTexts[0], 'Título: Contrato social')
    assert.include(embeddedTexts[0], 'Conteúdo:')

    assert.deepEqual(await service.indexScope(3), {
      scanned: 1,
      indexed: 0,
      unchanged: 1,
      failed: 0,
    })
    assert.equal(vectorWrites, 1)

    assert.deepEqual(await service.indexScope(3, {}, { force: true }), {
      scanned: 1,
      indexed: 1,
      unchanged: 0,
      failed: 0,
    })
    assert.equal(storedChunks[0].qdrantPointId, firstPointId)
    assert.equal(vectorWrites, 2)
  })

  test('persists a durable failure state when file extraction is unavailable', async ({
    assert,
  }) => {
    let failedCode: string | undefined
    let failureMetadata: Record<string, unknown> | undefined

    const service = serviceWith({
      knowledge: {
        listSources: async () => [source],
        sourceHashes: async () => new Map(),
        replaceDocumentChunks: async (
          _tenantId: number,
          _source: AiDocumentSource,
          _sourceHash: string,
          _embeddingModel: string,
          chunks: Array<{ metadata: Record<string, unknown> }>
        ) => {
          failureMetadata = chunks[0].metadata
        },
        markDocumentIndexFailed: async (
          _tenantId: number,
          _documentId: number,
          _embeddingModel: string,
          _sourceHash: string,
          code: string
        ) => {
          failedCode = code
        },
      },
      content: {
        extract: async () => ({
          text: source.description,
          origin: 'description',
          warnings: ['file_content_unavailable'],
          truncated: false,
        }),
      },
      retrieval: {
        embedMany: async () => assert.fail('embedding must not run after extraction failure'),
      },
      vector: {
        replaceDocument: async () => assert.fail('Qdrant must not run after extraction failure'),
      },
    })

    assert.deepEqual(await service.indexScope(3), {
      scanned: 1,
      indexed: 0,
      unchanged: 0,
      failed: 1,
    })
    assert.equal(failedCode, 'content_extraction_failed')
    assert.equal(failureMetadata?.index_failure, 'content_extraction_failed')
  })

  test('removes newly written vectors when the canonical row changed concurrently', async ({
    assert,
  }) => {
    let vectorDeletes = 0
    let failedCode: string | undefined

    const service = serviceWith({
      knowledge: {
        listSources: async () => [source],
        sourceHashes: async () => new Map(),
        replaceDocumentChunks: async () => {},
        markDocumentIndexed: async () => 0,
        markDocumentIndexFailed: async (
          _tenantId: number,
          _documentId: number,
          _embeddingModel: string,
          _sourceHash: string,
          code: string
        ) => {
          failedCode = code
        },
      },
      vector: {
        replaceDocument: async () => {},
        deleteDocument: async () => {
          vectorDeletes++
        },
      },
    })

    assert.deepEqual(await service.indexScope(3), {
      scanned: 1,
      indexed: 0,
      unchanged: 0,
      failed: 1,
    })
    assert.equal(vectorDeletes, 1)
    assert.equal(failedCode, 'qdrant_synchronization_failed')
  })
})
