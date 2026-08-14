import { BaseSeeder } from '@adonisjs/lucid/seeders'

import { precatoriosDemoUsers } from '#database/fixtures/precatorios_demo'
import { seedDemoAccess, seedLegalDemoAccess } from '#database/seed_support/demo_access'

export default class extends BaseSeeder {
  static environment = ['development']

  async run() {
    await seedLegalDemoAccess(this.client)
    await seedDemoAccess(this.client, precatoriosDemoUsers)
  }
}
