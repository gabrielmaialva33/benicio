import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('notifications', (table) => {
      table.increments('id')
      table
        .integer('tenant_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.integer('recipient_id').unsigned().notNullable()
      table.integer('actor_id').unsigned().nullable()

      table.string('type', 30).notNullable().defaultTo('info')
      table.string('title', 255).notNullable()
      table.text('message').notNullable()
      table.timestamp('read_at', { useTz: true }).nullable()
      table.jsonb('data').notNullable().defaultTo('{}')
      table.string('action_url', 2048).nullable()
      table.string('action_text', 100).nullable()

      table.timestamp('deleted_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['tenant_id', 'id'], 'notifications_tenant_id_id_unique')
      table
        .foreign(['recipient_id', 'tenant_id'], 'notifications_recipient_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('CASCADE')
      table
        .foreign(['actor_id', 'tenant_id'], 'notifications_actor_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('RESTRICT')
      table.index(
        ['tenant_id', 'recipient_id', 'read_at', 'created_at'],
        'notifications_recipient_unread_index'
      )
      table.index(['tenant_id', 'recipient_id', 'type'], 'notifications_recipient_type_index')
    })

    this.schema.createTable('messages', (table) => {
      table.increments('id')
      table
        .integer('tenant_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.integer('recipient_id').unsigned().notNullable()
      table.integer('sender_id').unsigned().nullable()

      table.string('subject', 255).notNullable()
      table.text('body').notNullable()
      table.string('priority', 20).notNullable().defaultTo('normal')
      table.timestamp('read_at', { useTz: true }).nullable()
      table.jsonb('metadata').notNullable().defaultTo('{}')

      table.timestamp('deleted_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['tenant_id', 'id'], 'messages_tenant_id_id_unique')
      table
        .foreign(['recipient_id', 'tenant_id'], 'messages_recipient_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('CASCADE')
      table
        .foreign(['sender_id', 'tenant_id'], 'messages_sender_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('RESTRICT')
      table.index(
        ['tenant_id', 'recipient_id', 'read_at', 'created_at'],
        'messages_recipient_unread_index'
      )
      table.index(['tenant_id', 'sender_id', 'created_at'], 'messages_sender_index')
    })

    this.defer(async (db) => {
      await db.rawQuery(
        `ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('info', 'success', 'warning', 'error', 'task', 'hearing', 'deadline', 'message', 'system'))`
      )
      await db.rawQuery(
        `ALTER TABLE messages ADD CONSTRAINT messages_priority_check CHECK (priority IN ('low', 'normal', 'high'))`
      )
    })
  }

  async down() {
    this.schema.dropTable('messages')
    this.schema.dropTable('notifications')
  }
}
