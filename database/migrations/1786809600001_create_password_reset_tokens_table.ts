import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'password_reset_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      // Só o digest SHA-256 é persistido: o token cru existe apenas no link
      // enviado por e-mail, seguindo o mesmo contrato de refresh_tokens.
      table.string('token_hash', 64).notNullable().unique()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('used_at', { useTz: true }).nullable()
      table.string('requested_ip', 64).nullable()
      table.string('user_agent', 512).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.index(['user_id'], 'password_reset_tokens_user_index')
      table.index(['expires_at'], 'password_reset_tokens_expires_at_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
