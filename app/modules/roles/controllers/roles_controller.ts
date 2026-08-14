import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

import { attachRoleValidator } from '#modules/roles/validators/roles_validator'

import ListRolesService from '#modules/roles/services/list_roles_service'
import SyncRolesService from '#modules/roles/services/sync_roles_service'

@inject()
export default class RolesController {
  constructor(
    private listRolesService: ListRolesService,
    private syncRolesService: SyncRolesService
  ) {}

  async list({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const perPage = request.input('perPage', 10)

    const roles = await this.listRolesService.run({ page, perPage })
    return response.json(roles)
  }

  async attach({ request, response }: HttpContext) {
    try {
      const { user_id: userId, role_ids: roleIds } = await attachRoleValidator.validate(
        request.all()
      )

      await this.syncRolesService.run({ userId, roleIds })

      return response.json({
        message: 'Role attached successfully',
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'messages' in error) {
        return response.unprocessableEntity({ errors: error.messages })
      }
      throw error
    }
  }
}
