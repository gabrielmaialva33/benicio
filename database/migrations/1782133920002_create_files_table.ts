import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'files'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('owner_id').unsigned().notNullable()
      table
        .integer('tenant_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')

      table.string('client_name').notNullable()
      table.string('file_name').notNullable()
      table.integer('file_size').unsigned().notNullable()
      table.string('file_type').notNullable()
      table.string('file_category').notNullable()
      table.string('storage_disk', 20).notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['tenant_id', 'id'], 'files_tenant_id_id_unique')
      table
        .foreign(['owner_id', 'tenant_id'], 'files_owner_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('RESTRICT')
      table.index(['tenant_id', 'created_at'], 'files_tenant_created_at_index')
      table.index(['owner_id', 'created_at'], 'files_owner_created_at_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
