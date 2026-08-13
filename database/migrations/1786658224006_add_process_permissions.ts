import { BaseSchema } from '@adonisjs/lucid/schema'
import app from '@adonisjs/core/services/app'

import CreateDefaultPermissionsService from '#modules/permissions/services/create_default_permissions_service'
import IPermission from '#modules/permissions/interfaces/permission_interface'
import IRole from '#modules/roles/interfaces/role_interface'

export default class extends BaseSchema {
  async up() {
    const trx = await this.db.transaction()

    try {
      const createPermissions = await app.container.make(CreateDefaultPermissionsService)
      await createPermissions.run(trx)

      const permissions = await trx
        .from('permissions')
        .where('resource', IPermission.Resources.PROCESSES)
        .select(['id', 'action'])
      const roles = await trx
        .from('roles')
        .whereIn('slug', [IRole.Slugs.ROOT, IRole.Slugs.ADMIN, IRole.Slugs.USER])
        .select(['id', 'slug'])

      const userActions = new Set([
        IPermission.Actions.CREATE,
        IPermission.Actions.READ,
        IPermission.Actions.UPDATE,
        IPermission.Actions.LIST,
      ])
      const assignments = roles.flatMap((role) =>
        permissions
          .filter(
            (permission) => role.slug !== IRole.Slugs.USER || userActions.has(permission.action)
          )
          .map((permission) => ({ role_id: role.id, permission_id: permission.id }))
      )

      if (assignments.length > 0) {
        await trx
          .table('role_permissions')
          .insert(assignments)
          .onConflict(['role_id', 'permission_id'])
          .ignore()
      }

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async down() {
    const permissionIds = this.db
      .from('permissions')
      .where('resource', IPermission.Resources.PROCESSES)
      .select('id')

    await this.db.from('role_permissions').whereIn('permission_id', permissionIds).delete()
    await this.db.from('user_permissions').whereIn('permission_id', permissionIds).delete()
    await this.db.from('permissions').where('resource', IPermission.Resources.PROCESSES).delete()
  }
}
