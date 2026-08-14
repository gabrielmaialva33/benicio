import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

import AiDocumentIndexService from '#modules/ai/services/ai_document_index_service'

interface IndexLegalDocumentPayload {
  tenantId: number
  documentId: number
}

export default class IndexLegalDocumentJob extends Job<IndexLegalDocumentPayload> {
  static options: JobOptions = {
    name: 'IndexLegalDocumentJob',
    queue: 'ai-indexing',
    maxRetries: 3,
    timeout: '10m',
    failOnTimeout: true,
  }

  async execute(): Promise<void> {
    const service = await app.container.make(AiDocumentIndexService)
    await service.indexDocument(this.payload.tenantId, this.payload.documentId)
  }

  async failed(error: Error): Promise<void> {
    logger.error(
      {
        tenantId: this.payload.tenantId,
        documentId: this.payload.documentId,
        errorName: error.name,
      },
      'Legal document indexing job exhausted its retries'
    )
  }
}
