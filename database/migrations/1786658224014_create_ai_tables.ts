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

      table.unique(['tenant_id', 'id'], 'ai_turns_tenant_id_id_unique')
      table
        .foreign(['tenant_id', 'conversation_id'], 'ai_turns_tenant_conversation_foreign')
        .references(['tenant_id', 'id'])
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
      table.uuid('turn_id').nullable()
      table.string('role', 20).notNullable()
      table.text('content').notNullable()
      table.string('status', 20).notNullable().defaultTo('completed')
      table.string('provider', 80).nullable()
      table.string('model', 255).nullable()
      table.jsonb('usage').notNullable().defaultTo('{}')
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      table
        .foreign(['tenant_id', 'conversation_id'], 'ai_messages_tenant_conversation_foreign')
        .references(['tenant_id', 'id'])
        .inTable('ai_conversations')
        .onDelete('CASCADE')
      table
        .foreign(['tenant_id', 'turn_id'], 'ai_messages_tenant_turn_foreign')
        .references(['tenant_id', 'id'])
        .inTable('ai_turns')
        .onDelete('CASCADE')
      table.index(['tenant_id', 'conversation_id', 'id'], 'ai_messages_conversation_index')
    })

    this.schema.createTable('ai_analyses', (table) => {
      table.increments('id')
      table
        .integer('tenant_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('RESTRICT')
      table.integer('document_id').unsigned().nullable()
      table.integer('folder_id').unsigned().nullable()
      table.integer('user_id').unsigned().notNullable()
      table.string('analysis_type', 80).notNullable()
      table.string('profile', 20).notNullable()
      table.string('provider', 80).nullable()
      table.string('model', 255).nullable()
      table.string('status', 20).notNullable().defaultTo('processing')
      table.jsonb('result').notNullable().defaultTo('{}')
      table.jsonb('error').nullable()
      table.integer('tokens_used').unsigned().nullable()
      table.integer('processing_time_ms').unsigned().nullable()
      table.jsonb('metadata').notNullable().defaultTo('{}')
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['tenant_id', 'id'], 'ai_analyses_tenant_id_id_unique')
      table
        .foreign(['tenant_id', 'document_id'], 'ai_analyses_tenant_document_foreign')
        .references(['tenant_id', 'id'])
        .inTable('legal_documents')
        .onDelete('RESTRICT')
      table
        .foreign(['tenant_id', 'folder_id'], 'ai_analyses_tenant_folder_foreign')
        .references(['tenant_id', 'id'])
        .inTable('folders')
        .onDelete('RESTRICT')
      table
        .foreign(['user_id', 'tenant_id'], 'ai_analyses_user_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('RESTRICT')
      table.index(['tenant_id', 'user_id', 'created_at'], 'ai_analyses_user_history_index')
      table.index(['tenant_id', 'analysis_type', 'created_at'], 'ai_analyses_type_index')
      table.index(['tenant_id', 'document_id', 'created_at'], 'ai_analyses_document_index')
      table.index(['tenant_id', 'folder_id', 'created_at'], 'ai_analyses_folder_index')
      table.index(['tenant_id', 'status', 'created_at'], 'ai_analyses_status_index')
    })

    this.schema.createTable('ai_document_chunks', (table) => {
      table.bigIncrements('id')
      table.uuid('qdrant_point_id').notNullable().unique()
      table
        .integer('tenant_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.integer('document_id').unsigned().notNullable()
      table.integer('folder_id').unsigned().notNullable()
      table.integer('chunk_index').unsigned().notNullable()
      table.text('content').notNullable()
      table.string('content_hash', 64).notNullable()
      table.string('source_hash', 64).notNullable()
      table.string('embedding_model', 255).notNullable()
      table.string('index_status', 20).notNullable().defaultTo('pending')
      table.timestamp('indexed_at', { useTz: true }).nullable()
      table.string('index_error', 500).nullable()
      table.jsonb('metadata').notNullable().defaultTo('{}')
      table.timestamp('source_updated_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table
        .foreign(['tenant_id', 'document_id'], 'ai_document_chunks_tenant_document_foreign')
        .references(['tenant_id', 'id'])
        .inTable('legal_documents')
        .onDelete('CASCADE')
      table
        .foreign(['tenant_id', 'folder_id'], 'ai_document_chunks_tenant_folder_foreign')
        .references(['tenant_id', 'id'])
        .inTable('folders')
        .onDelete('CASCADE')
      table.unique(
        ['tenant_id', 'document_id', 'chunk_index', 'embedding_model'],
        'ai_document_chunks_document_chunk_unique'
      )
      table.index(['tenant_id', 'folder_id', 'document_id'], 'ai_document_chunks_scope_index')
      table.index(['tenant_id', 'document_id', 'source_hash'], 'ai_document_chunks_source_index')
      table.index(['tenant_id', 'index_status', 'updated_at'], 'ai_document_chunks_status_index')
    })

    this.defer(async (db) => {
      await db.rawQuery(
        `ALTER TABLE ai_conversations ADD CONSTRAINT ai_conversations_mode_check CHECK (mode IN ('single', 'multi'))`
      )
      await db.rawQuery(
        `ALTER TABLE ai_conversations ADD CONSTRAINT ai_conversations_status_check CHECK (status IN ('active', 'generating', 'error'))`
      )
      await db.rawQuery(
        `ALTER TABLE ai_turns ADD CONSTRAINT ai_turns_profile_check CHECK (profile IN ('fast', 'deep'))`
      )
      await db.rawQuery(
        `ALTER TABLE ai_turns ADD CONSTRAINT ai_turns_status_check CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'))`
      )
      await db.rawQuery(
        `ALTER TABLE ai_messages ADD CONSTRAINT ai_messages_role_check CHECK (role IN ('user', 'assistant'))`
      )
      await db.rawQuery(
        `ALTER TABLE ai_messages ADD CONSTRAINT ai_messages_status_check CHECK (status IN ('pending', 'completed', 'failed', 'truncated'))`
      )
      await db.rawQuery(
        `ALTER TABLE ai_analyses ADD CONSTRAINT ai_analyses_profile_check CHECK (profile IN ('fast', 'deep'))`
      )
      await db.rawQuery(
        `ALTER TABLE ai_analyses ADD CONSTRAINT ai_analyses_status_check CHECK (status IN ('processing', 'completed', 'failed'))`
      )
      await db.rawQuery(
        `ALTER TABLE ai_document_chunks ADD CONSTRAINT ai_document_chunks_content_check CHECK (LENGTH(BTRIM(content)) > 0)`
      )
      await db.rawQuery(
        `ALTER TABLE ai_document_chunks ADD CONSTRAINT ai_document_chunks_index_status_check CHECK (index_status IN ('pending', 'indexed', 'failed'))`
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
    this.schema.dropTable('ai_document_chunks')
    this.schema.dropTable('ai_analyses')
    this.schema.dropTable('ai_messages')
    this.schema.dropTable('ai_turns')
    this.schema.dropTable('ai_conversations')
  }
}
