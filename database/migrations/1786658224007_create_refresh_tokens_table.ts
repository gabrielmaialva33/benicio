import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'refresh_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('family_id').notNullable()
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.integer('tenant_id').unsigned().nullable()

      // Only the SHA-256 digest is persisted. The raw refresh token exists
      // solely in the response returned to the client.
      table.string('token_hash', 64).notNullable().unique()
      table.uuid('replaced_by_id').nullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('used_at', { useTz: true }).nullable()
      table.timestamp('revoked_at', { useTz: true }).nullable()
      table.string('revoked_reason', 80).nullable()
      table.string('created_ip', 64).nullable()
      table.string('user_agent', 512).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      table
        .foreign(['user_id', 'tenant_id'], 'refresh_tokens_user_tenant_foreign')
        .references(['user_id', 'tenant_id'])
        .inTable('user_tenants')
        .onDelete('CASCADE')
      table
        .foreign('replaced_by_id', 'refresh_tokens_replaced_by_foreign')
        .references('id')
        .inTable('refresh_tokens')
        .onDelete('SET NULL')

      table.index(['user_id', 'family_id'], 'refresh_tokens_user_family_index')
      table.index(['expires_at'], 'refresh_tokens_expires_at_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
