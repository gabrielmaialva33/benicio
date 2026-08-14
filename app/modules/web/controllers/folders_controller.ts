import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import ConflictException from '#exceptions/conflict_exception'
import NotFoundException from '#exceptions/not_found_exception'
import FolderService from '#modules/folders/services/folder_service'
import {
  createFolderValidator,
  listFoldersValidator,
} from '#modules/folders/validators/folder_validators'
import FolderPageService from '#modules/web/services/folder_page_service'
import { requireTenantId } from '#shared/http/tenant_context'

export default class InertiaFoldersController {
  async index(ctx: HttpContext) {
    const input = await listFoldersValidator.validate(ctx.request.qs())
    const service = await app.container.make(FolderPageService)
    const page = await service.index(requireTenantId(ctx), input)

    return ctx.inertia.render('folders/index', page)
  }

  async create(ctx: HttpContext) {
    const service = await app.container.make(FolderPageService)
    const options = await service.formOptions(requireTenantId(ctx))

    return ctx.inertia.render('folders/create', options)
  }

  async store(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(createFolderValidator)
    const service = await app.container.make(FolderService)

    try {
      const folder = await service.create(requireTenantId(ctx), input)
      ctx.session.flash('success', `Pasta ${folder.code} criada com sucesso.`)
      return ctx.response.redirect().toPath(`/folders/${folder.id}`)
    } catch (error) {
      if (error instanceof ConflictException) {
        return this.redirectWithError(ctx, 'code', error.message)
      }
      if (error instanceof NotFoundException) {
        const field = error.message.includes('Client') ? 'client_id' : 'responsible_lawyer_id'
        return this.redirectWithError(ctx, field, error.message)
      }
      throw error
    }
  }

  async show(ctx: HttpContext) {
    const service = await app.container.make(FolderPageService)
    const page = await service.detail(requireTenantId(ctx), Number(ctx.params.id))

    return ctx.inertia.render('folders/show', page)
  }

  private redirectWithError(ctx: HttpContext, field: string, message: string) {
    ctx.session.flashAll()
    ctx.session.flash('inputErrorsBag', { [field]: [message] })
    return ctx.response.redirect().back()
  }
}
