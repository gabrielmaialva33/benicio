import { BaseSeeder } from '@adonisjs/lucid/seeders'

import { seedLegalDemoAccess } from '#database/seed_support/demo_access'

export default class extends BaseSeeder {
  static environment = ['development']

  async run() {
    await seedLegalDemoAccess(this.client)
  }
}
