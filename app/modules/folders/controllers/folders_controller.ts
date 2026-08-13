import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import { requireTenantId } from '#shared/http/tenant_context'
import FolderService from '#modules/folders/services/folder_service'
import {
  createFolderValidator,
  listFoldersValidator,
  updateFolderValidator,
} from '#modules/folders/validators/folder_validators'

export default class FoldersController {
  async index(ctx: HttpContext) {
    const input = await listFoldersValidator.validate(ctx.request.qs())
    const service = await app.container.make(FolderService)
    const folders = await service.list(requireTenantId(ctx), input)

    return ctx.response.json(folders)
  }

  async show(ctx: HttpContext) {
    const service = await app.container.make(FolderService)
    const folder = await service.get(requireTenantId(ctx), Number(ctx.params.id))

    return ctx.response.json({ data: folder })
  }

  async store(ctx: HttpContext) {
    const input = await createFolderValidator.validate(ctx.request.all())
    const service = await app.container.make(FolderService)
    const folder = await service.create(requireTenantId(ctx), input)

    return ctx.response.created({ data: folder })
  }

  async update(ctx: HttpContext) {
    const input = await updateFolderValidator.validate(ctx.request.all())
    const service = await app.container.make(FolderService)
    const folder = await service.update(requireTenantId(ctx), Number(ctx.params.id), input)

    return ctx.response.json({ data: folder })
  }

  async destroy(ctx: HttpContext) {
    const service = await app.container.make(FolderService)
    await service.delete(requireTenantId(ctx), Number(ctx.params.id))

    return ctx.response.noContent()
  }
}
