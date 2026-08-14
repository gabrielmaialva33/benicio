import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import ForbiddenException from '#exceptions/forbidden_exception'
import type IRole from '#modules/roles/interfaces/role_interface'
import CheckUserRoleService from '#modules/roles/services/check_user_role_service'

@inject()
export default class AclMiddleware {
  constructor(private checkUserRoleService: CheckUserRoleService) {}

  async handle({ auth, i18n }: HttpContext, next: NextFn, opts: { role_slugs: IRole.Slugs[] }) {
    // Get an authenticated user
    const user = auth.user

    if (!user) {
      throw new ForbiddenException(i18n.t('errors.permission_denied'))
    }

    const hasNecessaryRole = await this.checkUserRoleService.run(user, opts.role_slugs)

    if (hasNecessaryRole) {
      return next()
    }

    throw new ForbiddenException(i18n.t('errors.permission_denied'))
  }
}
