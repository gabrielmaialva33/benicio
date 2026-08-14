import { inject } from '@adonisjs/core'

import UsersRepository, {
  type PaginateUsersOptions,
} from '#modules/users/repositories/users_repository'

@inject()
export default class PaginateUserService {
  constructor(private userRepository: UsersRepository) {}

  async run(options: PaginateUsersOptions) {
    return this.userRepository.paginateWithRoles(options)
  }
}
