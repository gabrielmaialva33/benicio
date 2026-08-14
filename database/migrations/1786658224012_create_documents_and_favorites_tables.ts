import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('legal_documents', (table) => {
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
      table.integer('file_id').unsigned().notNullable()
      table.integer('created_by').unsigned().notNullable()

      table.string('document_type', 80).notNullable()
      table.string('title', 255).notNullable()
      table.text('description').nullable()
      table.integer('version').unsigned().notNullable().defaultTo(1)
      table.boolean('is_signed').notNullable().defaultTo(false)
      table.jsonb('metadata').notNullable().defaultTo('{}')

      table.timestamp('deleted_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['tenant_id', 'id'], 'legal_documents_tenant_id_id_unique')
      table
        .foreign(['tenant_id', 'folder_id'], 'legal_documents_tenant_folder_foreign')
        .references(['tenant_id', 'id'])
        .inTable('folders')
        .onDelete('RESTRICT')
      table
        .foreign(['tenant_id', 'process_id'], 'legal_documents_tenant_process_foreign')
        .references(['tenant_id', 'id'])
        .inTable('processes')
        .onDelete('RESTRICT')
      table
        .foreign(['tenant_id', 'file_id'], 'legal_documents_tenant_file_foreign')
        .references(['tenant_id', 'id'])
        .inTable('files')
        .onDelete('RESTRICT')
      table
        .foreign(['created_by', 'tenant_id'], 'legal_documents_creator_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('RESTRICT')
      table.index(['tenant_id', 'folder_id', 'created_at'], 'legal_documents_folder_index')
      table.index(['tenant_id', 'process_id', 'created_at'], 'legal_documents_process_index')
      table.index(['tenant_id', 'document_type'], 'legal_documents_type_index')
    })

    this.schema.createTable('folder_favorites', (table) => {
      table.increments('id')
      table
        .integer('tenant_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.integer('user_id').unsigned().notNullable()
      table.integer('folder_id').unsigned().notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      table
        .foreign(['user_id', 'tenant_id'], 'folder_favorites_user_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('CASCADE')
      table
        .foreign(['tenant_id', 'folder_id'], 'folder_favorites_tenant_folder_foreign')
        .references(['tenant_id', 'id'])
        .inTable('folders')
        .onDelete('CASCADE')
      table.unique(['tenant_id', 'user_id', 'folder_id'], 'folder_favorites_user_folder_unique')
      table.index(['tenant_id', 'user_id', 'created_at'], 'folder_favorites_user_index')
    })

    this.defer(async (db) => {
      await db.rawQuery(
        `ALTER TABLE legal_documents ADD CONSTRAINT legal_documents_version_check CHECK (version > 0)`
      )
      await db.rawQuery(
        `CREATE UNIQUE INDEX legal_documents_active_file_unique ON legal_documents (tenant_id, folder_id, COALESCE(process_id, 0), file_id) WHERE deleted_at IS NULL`
      )
    })
  }

  async down() {
    this.schema.dropTable('folder_favorites')
    this.schema.dropTable('legal_documents')
  }
}
