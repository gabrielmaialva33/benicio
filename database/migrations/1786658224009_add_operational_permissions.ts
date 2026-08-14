import { BaseSchema } from '@adonisjs/lucid/schema'
import app from '@adonisjs/core/services/app'

import CreateDefaultPermissionsService from '#modules/permissions/services/create_default_permissions_service'
import IPermission from '#modules/permissions/interfaces/permission_interface'
import IRole from '#modules/roles/interfaces/role_interface'

const OPERATIONAL_RESOURCES = [
  IPermission.Resources.TASKS,
  IPermission.Resources.HEARINGS,
  IPermission.Resources.DEADLINES,
  IPermission.Resources.MOVEMENTS,
  IPermission.Resources.DOCUMENTS,
  IPermission.Resources.DASHBOARD,
  IPermission.Resources.NOTIFICATIONS,
  IPermission.Resources.MESSAGES,
  IPermission.Resources.AI,
]

export default class extends BaseSchema {
  async up() {
    const trx = await this.db.transaction()
    try {
      const createPermissions = await app.container.make(CreateDefaultPermissionsService)
      await createPermissions.run(trx)

      const permissions = await trx
        .from('permissions')
        .whereIn('resource', OPERATIONAL_RESOURCES)
        .select(['id', 'resource', 'action'])
      const roles = await trx
        .from('roles')
        .whereIn('slug', [IRole.Slugs.ROOT, IRole.Slugs.ADMIN, IRole.Slugs.USER])
        .select(['id', 'slug'])

      const userWriteActions = new Set([
        IPermission.Actions.CREATE,
        IPermission.Actions.READ,
        IPermission.Actions.UPDATE,
        IPermission.Actions.LIST,
      ])
      const assignments = roles.flatMap((role) =>
        permissions
          .filter((permission) => {
            if (role.slug !== IRole.Slugs.USER) return true
            if (permission.resource === IPermission.Resources.DASHBOARD) {
              return permission.action === IPermission.Actions.READ
            }
            return userWriteActions.has(permission.action)
          })
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
      .whereIn('resource', OPERATIONAL_RESOURCES)
      .select('id')
    await this.db.from('role_permissions').whereIn('permission_id', permissionIds).delete()
    await this.db.from('user_permissions').whereIn('permission_id', permissionIds).delete()
    await this.db.from('permissions').whereIn('resource', OPERATIONAL_RESOURCES).delete()
  }
}
