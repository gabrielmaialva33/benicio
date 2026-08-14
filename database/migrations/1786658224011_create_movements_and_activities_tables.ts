import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('process_movements', (table) => {
      table.increments('id')
      table
        .integer('tenant_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('RESTRICT')
      table.integer('process_id').unsigned().notNullable()
      table.integer('created_by').unsigned().nullable()

      table.timestamp('occurred_at', { useTz: true }).notNullable()
      table.string('kind', 80).notNullable()
      table.string('title', 255).notNullable()
      table.text('description').nullable()
      table.string('source', 30).notNullable().defaultTo('manual')
      table.string('external_id', 255).nullable()
      table.jsonb('metadata').notNullable().defaultTo('{}')

      table.timestamp('deleted_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['tenant_id', 'id'], 'process_movements_tenant_id_id_unique')
      table
        .foreign(['tenant_id', 'process_id'], 'process_movements_tenant_process_foreign')
        .references(['tenant_id', 'id'])
        .inTable('processes')
        .onDelete('RESTRICT')
      table
        .foreign(['created_by', 'tenant_id'], 'process_movements_creator_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('RESTRICT')
      table.index(
        ['tenant_id', 'process_id', 'occurred_at'],
        'process_movements_tenant_process_occurred_index'
      )
      table.index(['tenant_id', 'kind', 'occurred_at'], 'process_movements_tenant_kind_index')
    })

    this.schema.createTable('activities', (table) => {
      table.increments('id')
      table
        .integer('tenant_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('RESTRICT')
      table.integer('folder_id').unsigned().notNullable()
      table.integer('process_id').unsigned().nullable()
      table.integer('actor_id').unsigned().nullable()

      table.string('event_type', 100).notNullable()
      table.string('summary', 500).notNullable()
      table.jsonb('data').notNullable().defaultTo('{}')
      table.timestamp('occurred_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['tenant_id', 'id'], 'activities_tenant_id_id_unique')
      table
        .foreign(['tenant_id', 'folder_id'], 'activities_tenant_folder_foreign')
        .references(['tenant_id', 'id'])
        .inTable('folders')
        .onDelete('RESTRICT')
      table
        .foreign(['tenant_id', 'process_id'], 'activities_tenant_process_foreign')
        .references(['tenant_id', 'id'])
        .inTable('processes')
        .onDelete('RESTRICT')
      table
        .foreign(['actor_id', 'tenant_id'], 'activities_actor_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('RESTRICT')
      table.index(['tenant_id', 'folder_id', 'occurred_at', 'id'], 'activities_folder_cursor_index')
      table.index(
        ['tenant_id', 'process_id', 'occurred_at', 'id'],
        'activities_process_cursor_index'
      )
      table.index(['tenant_id', 'event_type', 'occurred_at'], 'activities_event_type_index')
    })

    this.defer(async (db) => {
      await db.rawQuery(
        `ALTER TABLE process_movements ADD CONSTRAINT process_movements_source_check CHECK (source IN ('manual', 'court', 'integration', 'import'))`
      )
      await db.rawQuery(
        `CREATE UNIQUE INDEX process_movements_external_id_unique ON process_movements (tenant_id, source, external_id) WHERE external_id IS NOT NULL AND deleted_at IS NULL`
      )
    })
  }

  async down() {
    this.schema.dropTable('activities')
    this.schema.dropTable('process_movements')
  }
}
