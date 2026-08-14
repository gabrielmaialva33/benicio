import { inject } from '@adonisjs/core'

import ConflictException from '#exceptions/conflict_exception'
import NotFoundException from '#exceptions/not_found_exception'
import RolesRepository from '#modules/roles/repositories/roles_repository'
import UsersRepository from '#modules/users/repositories/users_repository'
import UnitOfWork from '#shared/lucid/unit_of_work'

type SyncRolesRequest = {
  userId: number
  roleIds: number[]
}

@inject()
export default class SyncRolesService {
  constructor(
    private usersRepository: UsersRepository,
    private rolesRepository: RolesRepository,
    private unitOfWork: UnitOfWork
  ) {}

  async run({ userId, roleIds }: SyncRolesRequest) {
    const uniqueRoleIds = [...new Set(roleIds)]

    await this.unitOfWork.run(async (trx) => {
      const user = await this.usersRepository.findBy('id', userId, { client: trx })
      if (!user) throw new NotFoundException('User not found')

      const existingRoleIds = await this.rolesRepository.findExistingIds(uniqueRoleIds, trx)
      if (existingRoleIds.length !== uniqueRoleIds.length) {
        throw new NotFoundException('Role not found')
      }

      const alreadyAttached = await this.usersRepository.findExistingRoleIds(
        userId,
        uniqueRoleIds,
        trx
      )
      if (alreadyAttached.length > 0) {
        throw new ConflictException('User already has this role')
      }

      await this.usersRepository.attachRoles(user, uniqueRoleIds, trx)
    })
  }
}
