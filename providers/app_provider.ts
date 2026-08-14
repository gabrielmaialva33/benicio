import type { ApplicationService } from '@adonisjs/core/types'

import AiVectorRepository from '#modules/ai/repositories/ai_vector_repository'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.singleton(AiVectorRepository, () => new AiVectorRepository())
  }

  /**
   * The container bindings have booted
   */
  async boot() {
    await import('#shared/extensions/logged_user_extension')
  }

  /**
   * The application has been booted
   */
  async start() {}

  /**
   * The process has been started
   */
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {}
}
