import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tasks'

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
      table.integer('folder_id').unsigned().nullable()
      table.integer('process_id').unsigned().nullable()
      table.integer('assignee_id').unsigned().nullable()
      table.integer('creator_id').unsigned().notNullable()

      table.string('title', 255).notNullable()
      table.text('description').nullable()
      table.string('status', 20).notNullable().defaultTo('pending')
      table.string('priority', 20).notNullable().defaultTo('medium')
      table.timestamp('due_date', { useTz: true }).nullable()
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.jsonb('tags').notNullable().defaultTo('[]')
      table.jsonb('metadata').notNullable().defaultTo('{}')

      table.timestamp('deleted_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['tenant_id', 'id'], 'tasks_tenant_id_id_unique')
      table
        .foreign(['tenant_id', 'folder_id'], 'tasks_tenant_folder_foreign')
        .references(['tenant_id', 'id'])
        .inTable('folders')
        .onDelete('RESTRICT')
      table
        .foreign(['tenant_id', 'process_id'], 'tasks_tenant_process_foreign')
        .references(['tenant_id', 'id'])
        .inTable('processes')
        .onDelete('RESTRICT')
      table
        .foreign(['assignee_id', 'tenant_id'], 'tasks_assignee_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('RESTRICT')
      table
        .foreign(['creator_id', 'tenant_id'], 'tasks_creator_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('RESTRICT')

      table.index(['tenant_id', 'status', 'due_date'], 'tasks_tenant_status_due_index')
      table.index(['tenant_id', 'assignee_id', 'due_date'], 'tasks_tenant_assignee_due_index')
      table.index(['tenant_id', 'folder_id'], 'tasks_tenant_folder_index')
      table.index(['tenant_id', 'process_id'], 'tasks_tenant_process_index')
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE tasks
        ADD CONSTRAINT tasks_status_check
        CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
      `)
      await db.rawQuery(`
        ALTER TABLE tasks
        ADD CONSTRAINT tasks_priority_check
        CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
      `)
      await db.rawQuery(`
        ALTER TABLE tasks
        ADD CONSTRAINT tasks_completion_check
        CHECK (
          (status = 'completed' AND completed_at IS NOT NULL)
          OR (status <> 'completed' AND completed_at IS NULL)
        )
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
