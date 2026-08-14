import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('ai_conversations', (table) => {
      table.increments('id')
      table
        .integer('tenant_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.integer('user_id').unsigned().notNullable()
      table.string('title', 160).notNullable()
      table.string('mode', 20).notNullable().defaultTo('single')
      table.string('status', 20).notNullable().defaultTo('active')
      table.string('last_error', 500).nullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['tenant_id', 'id'], 'ai_conversations_tenant_id_id_unique')
      table
        .foreign(['user_id', 'tenant_id'], 'ai_conversations_user_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('CASCADE')
      table.index(
        ['tenant_id', 'user_id', 'updated_at'],
        'ai_conversations_tenant_user_updated_index'
      )
    })

    this.schema.createTable('ai_messages', (table) => {
      table.increments('id')
      table
        .integer('tenant_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.integer('conversation_id').unsigned().notNullable()
      table.string('role', 20).notNullable()
      table.text('content').notNullable()
      table.string('provider', 50).nullable()
      table.string('model', 255).nullable()
      table.jsonb('usage').notNullable().defaultTo('{}')
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      table
        .foreign(['conversation_id', 'tenant_id'], 'ai_messages_conversation_tenant_foreign')
        .references(['id', 'tenant_id'])
        .inTable('ai_conversations')
        .onDelete('CASCADE')
      table.index(['tenant_id', 'conversation_id', 'id'], 'ai_messages_conversation_index')
    })

    this.defer(async (db) => {
      await db.rawQuery(
        `ALTER TABLE ai_conversations ADD CONSTRAINT ai_conversations_mode_check CHECK (mode IN ('single', 'multi'))`
      )
      await db.rawQuery(
        `ALTER TABLE ai_conversations ADD CONSTRAINT ai_conversations_status_check CHECK (status IN ('active', 'generating', 'error'))`
      )
      await db.rawQuery(
        `ALTER TABLE ai_messages ADD CONSTRAINT ai_messages_role_check CHECK (role IN ('user', 'assistant'))`
      )
    })
  }

  async down() {
    this.schema.dropTable('ai_messages')
    this.schema.dropTable('ai_conversations')
  }
}
