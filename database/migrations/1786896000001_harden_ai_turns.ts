import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('ai_turns', (table) => {
      table.uuid('id').primary()
      table
        .integer('tenant_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.integer('conversation_id').unsigned().notNullable()
      table.integer('user_id').unsigned().notNullable()
      table.string('idempotency_key', 128).nullable()
      table.string('request_hash', 64).notNullable()
      table.string('profile', 20).notNullable()
      table.string('status', 20).notNullable().defaultTo('pending')
      table.string('error', 500).nullable()
      table.timestamp('heartbeat_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['id', 'tenant_id'], 'ai_turns_id_tenant_unique')
      table
        .foreign(['conversation_id', 'tenant_id'], 'ai_turns_conversation_tenant_foreign')
        .references(['id', 'tenant_id'])
        .inTable('ai_conversations')
        .onDelete('CASCADE')
      table
        .foreign(['user_id', 'tenant_id'], 'ai_turns_user_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('CASCADE')
      table.index(
        ['tenant_id', 'conversation_id', 'status', 'heartbeat_at'],
        'ai_turns_active_lease_index'
      )
    })

    this.schema.alterTable('ai_messages', (table) => {
      table.uuid('turn_id').nullable()
      table.string('status', 20).notNullable().defaultTo('completed')
      table
        .foreign(['turn_id', 'tenant_id'], 'ai_messages_turn_tenant_foreign')
        .references(['id', 'tenant_id'])
        .inTable('ai_turns')
        .onDelete('CASCADE')
    })

    this.defer(async (db) => {
      await db.rawQuery(
        `ALTER TABLE ai_turns ADD CONSTRAINT ai_turns_profile_check CHECK (profile IN ('fast', 'deep'))`
      )
      await db.rawQuery(
        `ALTER TABLE ai_turns ADD CONSTRAINT ai_turns_status_check CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'))`
      )
      await db.rawQuery(
        `ALTER TABLE ai_messages ADD CONSTRAINT ai_messages_status_check CHECK (status IN ('pending', 'completed', 'failed', 'truncated'))`
      )
      await db.rawQuery(
        `CREATE UNIQUE INDEX ai_turns_idempotency_unique ON ai_turns (tenant_id, user_id, idempotency_key) WHERE idempotency_key IS NOT NULL`
      )
      await db.rawQuery(
        `CREATE UNIQUE INDEX ai_messages_turn_role_unique ON ai_messages (tenant_id, turn_id, role) WHERE turn_id IS NOT NULL`
      )
    })
  }

  async down() {
    this.schema.alterTable('ai_messages', (table) => {
      table.dropForeign(['turn_id', 'tenant_id'], 'ai_messages_turn_tenant_foreign')
      table.dropColumn('status')
      table.dropColumn('turn_id')
    })
    this.schema.dropTable('ai_turns')
  }
}
