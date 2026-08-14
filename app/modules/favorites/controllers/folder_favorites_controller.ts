import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import { requireTenantId } from '#shared/http/tenant_context'
import FolderFavoriteService from '#modules/favorites/services/folder_favorite_service'

export default class FolderFavoritesController {
  async index(ctx: HttpContext) {
    const service = await app.container.make(FolderFavoriteService)
    const data = await service.list(requireTenantId(ctx), ctx.auth.getUserOrFail().id)
    return ctx.response.ok({ data })
  }

  async check(ctx: HttpContext) {
    const service = await app.container.make(FolderFavoriteService)
    const isFavorite = await service.isFavorite(
      requireTenantId(ctx),
      ctx.auth.getUserOrFail().id,
      Number(ctx.params.folderId)
    )
    return ctx.response.ok({
      data: { folder_id: Number(ctx.params.folderId), is_favorite: isFavorite },
    })
  }

  async store(ctx: HttpContext) {
    const tenantId = requireTenantId(ctx)
    const userId = ctx.auth.getUserOrFail().id
    const folderId = Number(ctx.params.folderId)
    const service = await app.container.make(FolderFavoriteService)
    await service.add(tenantId, userId, folderId)
    return ctx.response.ok({ data: { folder_id: folderId, is_favorite: true } })
  }

  async destroy(ctx: HttpContext) {
    const tenantId = requireTenantId(ctx)
    const userId = ctx.auth.getUserOrFail().id
    const folderId = Number(ctx.params.folderId)
    const service = await app.container.make(FolderFavoriteService)
    await service.remove(tenantId, userId, folderId)
    return ctx.response.ok({ data: { folder_id: folderId, is_favorite: false } })
  }

  async toggle(ctx: HttpContext) {
    const tenantId = requireTenantId(ctx)
    const userId = ctx.auth.getUserOrFail().id
    const folderId = Number(ctx.params.folderId)
    const service = await app.container.make(FolderFavoriteService)
    const isFavorite = await service.toggle(tenantId, userId, folderId)
    return ctx.response.ok({ data: { folder_id: folderId, is_favorite: isFavorite } })
  }
}
