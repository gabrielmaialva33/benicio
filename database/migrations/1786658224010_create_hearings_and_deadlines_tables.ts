import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('hearings', (table) => {
      table.increments('id')
      table
        .integer('tenant_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('RESTRICT')
      table.integer('process_id').unsigned().notNullable()
      table.integer('creator_id').unsigned().notNullable()

      table.string('title', 255).notNullable()
      table.text('description').nullable()
      table.string('type', 30).notNullable()
      table.string('status', 20).notNullable().defaultTo('scheduled')
      table.timestamp('starts_at', { useTz: true }).notNullable()
      table.timestamp('ends_at', { useTz: true }).nullable()
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.string('location', 500).nullable()
      table.string('online_url', 2048).nullable()
      table.string('judge', 255).nullable()
      table.text('notes').nullable()
      table.text('result').nullable()
      table.jsonb('metadata').notNullable().defaultTo('{}')

      table.timestamp('deleted_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['tenant_id', 'id'], 'hearings_tenant_id_id_unique')
      table
        .foreign(['tenant_id', 'process_id'], 'hearings_tenant_process_foreign')
        .references(['tenant_id', 'id'])
        .inTable('processes')
        .onDelete('RESTRICT')
      table
        .foreign(['creator_id', 'tenant_id'], 'hearings_creator_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('RESTRICT')
      table.index(['tenant_id', 'starts_at'], 'hearings_tenant_starts_at_index')
      table.index(['tenant_id', 'process_id', 'starts_at'], 'hearings_tenant_process_starts_index')
      table.index(['tenant_id', 'status', 'starts_at'], 'hearings_tenant_status_starts_index')
    })

    this.schema.createTable('hearing_attendees', (table) => {
      table.increments('id')
      table
        .integer('tenant_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('RESTRICT')
      table.integer('hearing_id').unsigned().notNullable()
      table.integer('user_id').unsigned().notNullable()
      table.string('role', 80).nullable()
      table.boolean('is_required').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table
        .foreign(['tenant_id', 'hearing_id'], 'hearing_attendees_tenant_hearing_foreign')
        .references(['tenant_id', 'id'])
        .inTable('hearings')
        .onDelete('CASCADE')
      table
        .foreign(['user_id', 'tenant_id'], 'hearing_attendees_user_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('RESTRICT')
      table.unique(['hearing_id', 'user_id'], 'hearing_attendees_hearing_user_unique')
      table.index(['tenant_id', 'user_id'], 'hearing_attendees_tenant_user_index')
    })

    this.schema.createTable('deadlines', (table) => {
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
      table.integer('assignee_id').unsigned().nullable()
      table.integer('creator_id').unsigned().notNullable()

      table.string('title', 255).notNullable()
      table.text('description').nullable()
      table.string('kind', 30).notNullable()
      table.string('status', 20).notNullable().defaultTo('pending')
      table.string('priority', 20).notNullable().defaultTo('medium')
      table.boolean('is_fatal').notNullable().defaultTo(false)
      table.timestamp('due_at', { useTz: true }).notNullable()
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.text('legal_basis').nullable()
      table.text('notes').nullable()
      table.jsonb('metadata').notNullable().defaultTo('{}')

      table.timestamp('deleted_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['tenant_id', 'id'], 'deadlines_tenant_id_id_unique')
      table
        .foreign(['tenant_id', 'folder_id'], 'deadlines_tenant_folder_foreign')
        .references(['tenant_id', 'id'])
        .inTable('folders')
        .onDelete('RESTRICT')
      table
        .foreign(['tenant_id', 'process_id'], 'deadlines_tenant_process_foreign')
        .references(['tenant_id', 'id'])
        .inTable('processes')
        .onDelete('RESTRICT')
      table
        .foreign(['assignee_id', 'tenant_id'], 'deadlines_assignee_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('RESTRICT')
      table
        .foreign(['creator_id', 'tenant_id'], 'deadlines_creator_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('RESTRICT')
      table.index(['tenant_id', 'status', 'due_at'], 'deadlines_tenant_status_due_index')
      table.index(['tenant_id', 'assignee_id', 'due_at'], 'deadlines_tenant_assignee_due_index')
      table.index(['tenant_id', 'folder_id', 'due_at'], 'deadlines_tenant_folder_due_index')
      table.index(['tenant_id', 'process_id'], 'deadlines_tenant_process_index')
    })

    this.defer(async (db) => {
      await db.rawQuery(
        `ALTER TABLE hearings ADD CONSTRAINT hearings_type_check CHECK (type IN ('audience', 'judgment', 'conciliation', 'instruction', 'other'))`
      )
      await db.rawQuery(
        `ALTER TABLE hearings ADD CONSTRAINT hearings_status_check CHECK (status IN ('scheduled', 'completed', 'cancelled', 'postponed'))`
      )
      await db.rawQuery(
        `ALTER TABLE hearings ADD CONSTRAINT hearings_time_range_check CHECK (ends_at IS NULL OR ends_at > starts_at)`
      )
      await db.rawQuery(
        `ALTER TABLE hearings ADD CONSTRAINT hearings_completion_check CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR (status <> 'completed' AND completed_at IS NULL))`
      )
      await db.rawQuery(
        `ALTER TABLE deadlines ADD CONSTRAINT deadlines_kind_check CHECK (kind IN ('judicial', 'extrajudicial', 'administrative', 'internal'))`
      )
      await db.rawQuery(
        `ALTER TABLE deadlines ADD CONSTRAINT deadlines_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))`
      )
      await db.rawQuery(
        `ALTER TABLE deadlines ADD CONSTRAINT deadlines_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent'))`
      )
      await db.rawQuery(
        `ALTER TABLE deadlines ADD CONSTRAINT deadlines_completion_check CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR (status <> 'completed' AND completed_at IS NULL))`
      )
    })
  }

  async down() {
    this.schema.dropTable('deadlines')
    this.schema.dropTable('hearing_attendees')
    this.schema.dropTable('hearings')
  }
}
