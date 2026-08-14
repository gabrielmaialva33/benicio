import { inject } from '@adonisjs/core'

import type IRole from '#modules/roles/interfaces/role_interface'
import UsersRepository from '#modules/users/repositories/users_repository'
import type User from '#modules/users/models/user'

@inject()
export default class CheckUserRoleService {
  constructor(private usersRepository: UsersRepository) {}

  async run(user: User, requiredRoles: IRole.Slugs[]): Promise<boolean> {
    if (!user.$preloaded?.roles) await this.usersRepository.loadRoles(user)
    return user.roles.some((role) => requiredRoles.includes(role.slug))
  }
}
