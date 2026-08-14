import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

import UsersRepository, {
  type UserPermissionRow,
} from '#modules/users/repositories/users_repository'
import NotFoundException from '#exceptions/not_found_exception'

type ResolvedUserPermission = UserPermissionRow & { source: 'role' | 'direct' }

@inject()
export default class GetUserPermissionsService {
  constructor(private usersRepository: UsersRepository) {}

  async run(userId: number) {
    const { i18n } = HttpContext.getOrFail()

    const user = await this.usersRepository.findBy('id', userId)
    if (!user) {
      throw new NotFoundException(
        i18n.t('errors.not_found', {
          resource: i18n.t('models.user'),
        })
      )
    }

    const [directPermissions, rolePermissions] = await Promise.all([
      this.usersRepository.listGrantedDirectPermissionRows(userId),
      this.usersRepository.listRolePermissionRows(userId),
    ])

    // Combine permissions (remove duplicates)
    const permissionMap = new Map<number, ResolvedUserPermission>()

    // Add role permissions first
    rolePermissions.forEach((perm) => {
      permissionMap.set(perm.id, {
        id: perm.id,
        name: perm.name,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
        source: 'role',
      })
    })

    // Add direct permissions (they override role permissions)
    directPermissions.forEach((perm) => {
      permissionMap.set(perm.id, {
        id: perm.id,
        name: perm.name,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
        expires_at: perm.expires_at,
        granted: perm.granted,
        source: 'direct',
      })
    })

    // Group permissions by resource
    const groupedPermissions: Record<string, ResolvedUserPermission[]> = {}

    Array.from(permissionMap.values()).forEach((permission) => {
      if (!groupedPermissions[permission.resource]) {
        groupedPermissions[permission.resource] = []
      }
      groupedPermissions[permission.resource].push(permission)
    })

    return {
      total: permissionMap.size,
      permissions: Array.from(permissionMap.values()),
      grouped: groupedPermissions,
    }
  }
}
