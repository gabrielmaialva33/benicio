import env from '#start/env'
import aiConfig from '#config/ai'

const timeoutMs = env.get('QDRANT_TIMEOUT_MS') ?? 10_000
if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) {
  throw new Error('QDRANT_TIMEOUT_MS must be an integer between 1000 and 120000')
}

const collection = env.get('QDRANT_COLLECTION')?.trim() || 'benicio_legal_documents'
if (!/^[A-Za-z0-9_-]{1,128}$/.test(collection)) {
  throw new Error('QDRANT_COLLECTION must contain only letters, numbers, underscores, or hyphens')
}

const qdrantConfig = {
  url: env.get('QDRANT_URL')?.trim() || 'http://127.0.0.1:6335',
  apiKey: env.get('QDRANT_API_KEY')?.trim() || undefined,
  collection,
  timeoutMs,
  vectorSize: aiConfig.retrieval.dimensions,
} as const

export default qdrantConfig
