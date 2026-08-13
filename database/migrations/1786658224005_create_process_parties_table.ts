import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'process_parties'

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
      table.integer('process_id').unsigned().notNullable()

      table.string('side', 20).notNullable()
      table.string('role', 80).nullable()
      table.boolean('is_primary').notNullable().defaultTo(false)
      table.string('name', 255).notNullable()
      table.string('document', 32).nullable()
      table.string('person_type', 20).nullable()
      table.jsonb('metadata').notNullable().defaultTo('{}')

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table
        .foreign(['tenant_id', 'process_id'], 'process_parties_tenant_process_foreign')
        .references(['tenant_id', 'id'])
        .inTable('processes')
        .onDelete('CASCADE')
      table.index(['tenant_id', 'process_id'], 'process_parties_tenant_process_index')
      table.index(['tenant_id', 'document'], 'process_parties_tenant_document_index')
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE process_parties
        ADD CONSTRAINT process_parties_side_check
        CHECK (side IN ('active', 'passive', 'third', 'other'))
      `)

      await db.rawQuery(`
        ALTER TABLE process_parties
        ADD CONSTRAINT process_parties_person_type_check
        CHECK (person_type IS NULL OR person_type IN ('individual', 'company'))
      `)

      await db.rawQuery(`
        ALTER TABLE process_parties
        ADD CONSTRAINT process_parties_document_format_check
        CHECK (
          document IS NULL
          OR (person_type = 'individual' AND document ~ '^[0-9]{11}$')
          OR (person_type = 'company' AND document ~ '^[A-Z0-9]{12}[0-9]{2}$')
        )
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX process_parties_primary_side_unique
        ON process_parties (tenant_id, process_id, side)
        WHERE is_primary
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
