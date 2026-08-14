import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_roles'

  async up() {
    // The pivot has no payload: repeated pairs are indistinguishable. Keep the
    // oldest row before enforcing the same integrity guaranteed by other pivots.
    await this.db.rawQuery(`
      DELETE FROM user_roles AS duplicate
      USING user_roles AS canonical
      WHERE duplicate.user_id = canonical.user_id
        AND duplicate.role_id = canonical.role_id
        AND duplicate.id > canonical.id
    `)

    this.schema.alterTable(this.tableName, (table) => {
      table.unique(['user_id', 'role_id'], 'user_roles_user_id_role_id_unique')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['user_id', 'role_id'], 'user_roles_user_id_role_id_unique')
    })
  }
}
