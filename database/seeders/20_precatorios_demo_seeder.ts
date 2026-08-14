import logger from '@adonisjs/core/services/logger'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

import { seedPrecatoriosDemo } from '#database/seed_support/precatorios_demo_seed'

export default class extends BaseSeeder {
  static environment = ['development']

  async run() {
    const summary = await seedPrecatoriosDemo(this.client)
    logger.info({ seed: summary }, 'Precatorios demo data is ready')
  }
}
