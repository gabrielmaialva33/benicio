import { inject } from '@adonisjs/core'

import PermissionRepository from '#modules/permissions/repositories/permission_repository'
import Permission from '#modules/permissions/models/permission'
import IPermission from '#modules/permissions/interfaces/permission_interface'

@inject()
export default class CreatePermissionService {
  constructor(private permissionRepository: PermissionRepository) {}

  async handle(data: IPermission.PermissionData): Promise<Permission> {
    const context = data.context ?? IPermission.Contexts.ANY
    const defaultName =
      context === IPermission.Contexts.ANY
        ? `${data.resource}.${data.action}`
        : `${data.resource}.${data.action}.${context}`

    // Resource, action and context form the permission's domain identity.
    const existingPermission = await this.permissionRepository.findByResourceAction(
      data.resource,
      data.action,
      context
    )

    if (existingPermission) {
      return this.permissionRepository.updateExisting(existingPermission, {
        name: data.name || defaultName,
        description: data.description,
      })
    }

    // Create new permission
    return this.permissionRepository.create({
      name: data.name || defaultName,
      description: data.description,
      resource: data.resource,
      action: data.action,
      context,
    })
  }
}
