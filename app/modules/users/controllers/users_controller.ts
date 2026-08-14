import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

import PaginateUserService from '#modules/users/services/paginate_user_service'
import GetUserService from '#modules/users/services/get_user_service'
import CreateUserService from '#modules/users/services/create_user_service'
import EditUserService from '#modules/users/services/edit_user_service'
import DeleteUserService from '#modules/users/services/delete_user_service'

import {
  createUserValidator,
  editUserValidator,
  listUsersValidator,
} from '#modules/users/validators/users_validator'

@inject()
export default class UsersController {
  constructor(
    private paginateUserService: PaginateUserService,
    private getUserService: GetUserService,
    private createUserService: CreateUserService,
    private editUserService: EditUserService,
    private deleteUserService: DeleteUserService
  ) {}

  async paginate({ request, response }: HttpContext) {
    const input = await listUsersValidator.validate(request.qs())
    const users = await this.paginateUserService.run({
      page: input.page,
      perPage: input.per_page,
      sortBy: input.sort_by,
      direction: input.order,
      search: input.search,
    })

    return response.json(users)
  }

  async get({ params, response }: HttpContext) {
    const userId = +params.id

    const user = await this.getUserService.run(userId)
    if (!user) {
      return response.status(404).json({
        message: 'User not found',
      })
    }
    return response.json(user)
  }

  async create({ request, response }: HttpContext) {
    const payload = await createUserValidator.validate(request.all())

    const user = await this.createUserService.run(payload)
    return response.created(user)
  }

  async update({ params, request, response }: HttpContext) {
    const userId = +params.id
    const payload = await editUserValidator.validate(request.all(), { meta: { userId } })

    const user = await this.editUserService.run(userId, payload)
    return response.json(user)
  }

  async delete({ params, response }: HttpContext) {
    const userId = +params.id

    await this.deleteUserService.run(userId)

    return response.noContent()
  }
}
