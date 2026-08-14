import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'permissions'

  async up() {
    await this.db.from(this.tableName).whereNull('context').update({ context: 'any' })

    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['resource', 'action'], 'permissions_resource_action_unique')
      table.string('context', 50).notNullable().defaultTo('any').alter()
      table.unique(['resource', 'action', 'context'], 'permissions_resource_action_context_unique')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(
        ['resource', 'action', 'context'],
        'permissions_resource_action_context_unique'
      )
      table.string('context', 50).nullable().defaultTo('any').alter()
      table.unique(['resource', 'action'], 'permissions_resource_action_unique')
    })
  }
}
