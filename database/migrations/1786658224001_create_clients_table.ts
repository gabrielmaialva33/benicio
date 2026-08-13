import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'clients'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('tenant_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('RESTRICT')

      table.string('name', 255).notNullable()
      table.string('document', 32).notNullable()
      table.string('person_type', 20).notNullable()
      table.string('email', 254).nullable()
      table.string('phone', 32).nullable()
      table.jsonb('address').nullable()
      table.text('notes').nullable()
      table.jsonb('metadata').notNullable().defaultTo('{}')

      table.timestamp('deleted_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Supports tenant-safe composite references from legal domain tables.
      table.unique(['tenant_id', 'id'], 'clients_tenant_id_id_unique')
      table.index(['tenant_id', 'name'], 'clients_tenant_name_index')
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE clients
        ADD CONSTRAINT clients_person_type_check
        CHECK (person_type IN ('individual', 'company'))
      `)

      await db.rawQuery(`
        ALTER TABLE clients
        ADD CONSTRAINT clients_document_format_check
        CHECK (
          (person_type = 'individual' AND document ~ '^[0-9]{11}$')
          OR
          (person_type = 'company' AND document ~ '^[A-Z0-9]{12}[0-9]{2}$')
        )
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX clients_tenant_document_active_unique
        ON clients (tenant_id, document)
        WHERE deleted_at IS NULL
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
