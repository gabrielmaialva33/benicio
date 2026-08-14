import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import NotFoundException from '#exceptions/not_found_exception'
import CreateUserService from '#modules/users/services/create_user_service'
import EditUserService from '#modules/users/services/edit_user_service'
import DeleteUserService from '#modules/users/services/delete_user_service'
import GetUserService from '#modules/users/services/get_user_service'
import PaginateUserService from '#modules/users/services/paginate_user_service'

import {
  createUserValidator,
  editUserValidator,
  listUsersValidator,
} from '#modules/users/validators/users_validator'
import { inertiaRedirectTo } from '#shared/http/inertia_redirect'

@inject()
export default class InertiaUsersController {
  constructor(
    private paginateUserService: PaginateUserService,
    private getUserService: GetUserService,
    private createUserService: CreateUserService,
    private editUserService: EditUserService,
    private deleteUserService: DeleteUserService
  ) {}

  async index({ inertia, request }: HttpContext) {
    const input = await listUsersValidator.validate(request.qs())
    const users = await this.paginateUserService.run({
      page: input.page,
      perPage: input.per_page,
      search: input.search,
      sortBy: input.sort_by ?? 'created_at',
      direction: input.order ?? 'desc',
    })

    return inertia.render('users/index', {
      users: users.toJSON(),
      search: input.search ?? '',
      sortBy: input.sort_by ?? 'created_at',
      direction: input.order ?? 'desc',
    })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('users/create', {})
  }

  async store(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(createUserValidator)
    await this.createUserService.run(payload)

    return inertiaRedirectTo(ctx, '/users')
  }

  async edit({ inertia, params }: HttpContext) {
    const user = await this.getUserService.run(Number(params.id))
    if (!user) throw new NotFoundException('User not found')

    return inertia.render('users/edit', { user })
  }

  async update(ctx: HttpContext) {
    const userId = Number(ctx.params.id)
    const payload = await ctx.request.validateUsing(editUserValidator, {
      meta: {
        userId,
      },
    })
    await this.editUserService.run(userId, payload)

    return inertiaRedirectTo(ctx, '/users')
  }

  async destroy(ctx: HttpContext) {
    await this.deleteUserService.run(Number(ctx.params.id))

    return inertiaRedirectTo(ctx, '/users')
  }
}
