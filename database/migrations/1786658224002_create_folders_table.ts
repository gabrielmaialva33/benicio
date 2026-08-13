import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'folders'

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

      table.string('code', 80).notNullable()
      table.string('title', 255).notNullable()
      table.text('description').nullable()
      table.string('status', 20).notNullable().defaultTo('active')
      // Area is intentionally data, not a PostgreSQL enum. Current imports use
      // business labels that do not match the legacy hard-coded English list.
      table.string('area', 120).notNullable()
      table.string('subarea', 120).nullable()
      table.integer('client_id').unsigned().notNullable()
      table
        .integer('responsible_lawyer_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.jsonb('metadata').notNullable().defaultTo('{}')

      table.timestamp('deleted_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['tenant_id', 'id'], 'folders_tenant_id_id_unique')
      table
        .foreign(['tenant_id', 'client_id'], 'folders_tenant_client_foreign')
        .references(['tenant_id', 'id'])
        .inTable('clients')
        .onDelete('RESTRICT')
      table.index(['tenant_id', 'status', 'area'], 'folders_tenant_status_area_index')
      table.index(['tenant_id', 'client_id'], 'folders_tenant_client_index')
      table.index(['tenant_id', 'responsible_lawyer_id'], 'folders_tenant_lawyer_index')
      table.index(['tenant_id', 'created_at'], 'folders_tenant_created_at_index')
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE folders
        ADD CONSTRAINT folders_status_check
        CHECK (status IN ('active', 'completed', 'pending', 'cancelled', 'archived'))
      `)

      await db.rawQuery(`
        ALTER TABLE folders
        ADD CONSTRAINT folders_code_normalized_check
        CHECK (code = UPPER(BTRIM(code)) AND LENGTH(code) > 0)
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX folders_tenant_code_active_unique
        ON folders (tenant_id, code)
        WHERE deleted_at IS NULL
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
