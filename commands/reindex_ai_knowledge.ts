import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import AiKnowledgeRepository from '#modules/ai/repositories/ai_knowledge_repository'
import AiDocumentIndexService from '#modules/ai/services/ai_document_index_service'

export default class ReindexAiKnowledge extends BaseCommand {
  static commandName = 'ai:reindex'
  static description = 'Reconcile PostgreSQL legal documents with the derived Qdrant index'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.number({ description: 'Only index this tenant ID', alias: 't' })
  declare tenant?: number

  @flags.number({ description: 'Only index this document ID (requires --tenant)', alias: 'd' })
  declare document?: number

  @flags.boolean({ description: 'Rebuild vectors even when PostgreSQL hashes are unchanged' })
  declare force: boolean

  async run() {
    if (this.tenant !== undefined && (!Number.isInteger(this.tenant) || this.tenant <= 0)) {
      this.logger.error('--tenant must be a positive integer')
      this.exitCode = 1
      return
    }
    if (this.document !== undefined && (!Number.isInteger(this.document) || this.document <= 0)) {
      this.logger.error('--document must be a positive integer')
      this.exitCode = 1
      return
    }
    if (this.document !== undefined && this.tenant === undefined) {
      this.logger.error('--document requires --tenant')
      this.exitCode = 1
      return
    }

    try {
      const indexService = await this.app.container.make(AiDocumentIndexService)
      const knowledgeRepository = await this.app.container.make(AiKnowledgeRepository)
      const tenantIds = this.tenant
        ? [this.tenant]
        : await knowledgeRepository.listActiveTenantIds()
      const total = { scanned: 0, indexed: 0, unchanged: 0, failed: 0 }

      for (const tenantId of tenantIds) {
        const summary = await indexService.indexScope(
          tenantId,
          this.document ? { document_ids: [this.document] } : {},
          { force: this.force }
        )
        total.scanned += summary.scanned
        total.indexed += summary.indexed
        total.unchanged += summary.unchanged
        total.failed += summary.failed
        this.logger.info(
          `Tenant ${tenantId}: ${summary.indexed} indexed, ${summary.unchanged} unchanged, ${summary.failed} failed`
        )
      }

      if (this.document !== undefined && total.scanned === 0) {
        this.logger.error('Document not found in the selected tenant')
        this.exitCode = 1
        return
      }
      if (total.failed > 0) {
        this.logger.error(
          `Reindex completed with failures: ${total.indexed} indexed, ${total.unchanged} unchanged, ${total.failed} failed`
        )
        this.exitCode = 1
        return
      }
      this.logger.success(
        `Reindex complete: ${total.indexed} indexed, ${total.unchanged} unchanged`
      )
    } catch (error) {
      this.logger.error('AI knowledge reindex failed')
      this.error = error
    }
  }
}
