import { test } from '@japa/runner'

import NvidiaRetrievalProvider, {
  AiRetrievalRequestError,
} from '#modules/ai/providers/nvidia_retrieval_provider'

function options() {
  return {
    apiKey: 'test-key',
    embeddingModel: 'nvidia/test-embed',
    embeddingUrl: 'https://nvidia.example.test/v1/embeddings',
    rerankModel: 'nvidia/test-rerank',
    rerankUrl: 'https://nvidia.example.test/v1/reranking',
    dimensions: 4,
    timeoutMs: 1_000,
    batchSize: 2,
  }
}

test.group('NVIDIA retrieval provider', () => {
  test('batches passage embeddings and preserves provider ordering', async ({ assert }) => {
    const requests: Record<string, unknown>[] = []
    const fetcher: typeof fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      requests.push(body)
      const texts = body.input as string[]
      return Response.json({
        data: texts.map((_text, index) => ({
          index,
          embedding: [index + 1, 0, 0, 0],
        })),
      })
    }
    const provider = new NvidiaRetrievalProvider(options(), fetcher)

    const vectors = await provider.embedMany(['um', 'dois', 'tres'], 'passage')

    assert.lengthOf(requests, 2)
    assert.equal(requests[0].input_type, 'passage')
    assert.deepEqual(requests[0].input, ['um', 'dois'])
    assert.deepEqual(requests[1].input, ['tres'])
    assert.deepEqual(vectors, [
      [1, 0, 0, 0],
      [2, 0, 0, 0],
      [1, 0, 0, 0],
    ])
  })

  test('retries a transient response without exposing its body', async ({ assert }) => {
    let calls = 0
    const fetcher: typeof fetch = async () => {
      calls++
      if (calls === 1) return new Response('sensitive upstream body', { status: 429 })
      return Response.json({ data: [{ index: 0, embedding: [1, 2, 3, 4] }] })
    }
    const provider = new NvidiaRetrievalProvider(options(), fetcher)

    const result = await provider.embedMany(['consulta'], 'query')

    assert.equal(calls, 2)
    assert.deepEqual(result, [[1, 2, 3, 4]])
  })

  test('validates embedding dimensions and complete rerank results', async ({ assert }) => {
    const invalidEmbedding: typeof fetch = async () =>
      Response.json({ data: [{ index: 0, embedding: [1, 2] }] })
    const provider = new NvidiaRetrievalProvider(options(), invalidEmbedding)

    await assert.rejects(
      () => provider.embedMany(['consulta'], 'query'),
      'AI embedding dimensions do not match the configured index'
    )

    const invalidRanking: typeof fetch = async () =>
      Response.json({ rankings: [{ index: 0, logit: 2.4 }] })
    const reranker = new NvidiaRetrievalProvider(options(), invalidRanking)
    await assert.rejects(
      () => reranker.rerank('consulta', ['um', 'dois']),
      'AI reranker returned an incomplete ranking'
    )
  })

  test('uses provider scores for a single passage and sorts rankings by relevance', async ({
    assert,
  }) => {
    const singleFetcher: typeof fetch = async () =>
      Response.json({ rankings: [{ index: 0, logit: 1.25 }] })
    const single = new NvidiaRetrievalProvider(options(), singleFetcher)
    assert.deepEqual(await single.rerank('consulta', ['único']), [{ index: 0, score: 1.25 }])

    const unsortedFetcher: typeof fetch = async () =>
      Response.json({
        rankings: [
          { index: 0, logit: 0.2 },
          { index: 1, logit: 2.4 },
        ],
      })
    const unsorted = new NvidiaRetrievalProvider(options(), unsortedFetcher)
    assert.deepEqual(await unsorted.rerank('consulta', ['menos', 'mais']), [
      { index: 1, score: 2.4 },
      { index: 0, score: 0.2 },
    ])
  })

  test('fails closed when the API key is missing', async ({ assert }) => {
    const provider = new NvidiaRetrievalProvider({ ...options(), apiKey: undefined })
    await assert.rejects(
      () => provider.embedMany(['consulta'], 'query'),
      'AI retrieval provider is not configured'
    )
  })

  test('marks non-transient client errors as non-retryable', ({ assert }) => {
    const error = new AiRetrievalRequestError('invalid request', 'http', 422, 'request-id')
    assert.isFalse(error.retryable)
    assert.equal(error.requestId, 'request-id')
  })
})
