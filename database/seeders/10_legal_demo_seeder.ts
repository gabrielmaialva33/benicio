import logger from '@adonisjs/core/services/logger'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

import { seedLegalDemo } from '#database/seed_support/legal_demo_seed'

export default class extends BaseSeeder {
  static environment = ['development']

  async run() {
    const summary = await seedLegalDemo(this.client)
    logger.info({ seed: summary }, 'Legal demo data is ready')
  }
}
