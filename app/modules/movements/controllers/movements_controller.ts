import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import { requireTenantId } from '#shared/http/tenant_context'
import MovementService from '#modules/movements/services/movement_service'
import {
  createMovementValidator,
  listMovementsValidator,
  updateMovementValidator,
} from '#modules/movements/validators/movement_validators'

export default class MovementsController {
  async index(ctx: HttpContext) {
    const input = await listMovementsValidator.validate(ctx.request.qs())
    const service = await app.container.make(MovementService)
    return ctx.response.ok(await service.list(requireTenantId(ctx), input))
  }

  async indexForProcess(ctx: HttpContext) {
    const input = await listMovementsValidator.validate({
      ...ctx.request.qs(),
      process_id: Number(ctx.params.processId),
    })
    const service = await app.container.make(MovementService)
    return ctx.response.ok(await service.list(requireTenantId(ctx), input))
  }

  async indexForFolder(ctx: HttpContext) {
    const input = await listMovementsValidator.validate({
      ...ctx.request.qs(),
      folder_id: Number(ctx.params.folderId),
    })
    const service = await app.container.make(MovementService)
    return ctx.response.ok(await service.list(requireTenantId(ctx), input))
  }

  async show(ctx: HttpContext) {
    const service = await app.container.make(MovementService)
    return ctx.response.ok({ data: await service.get(requireTenantId(ctx), Number(ctx.params.id)) })
  }

  async storeForProcess(ctx: HttpContext) {
    const input = await createMovementValidator.validate(ctx.request.all())
    const service = await app.container.make(MovementService)
    const movement = await service.create(
      requireTenantId(ctx),
      Number(ctx.params.processId),
      ctx.auth.getUserOrFail().id,
      input
    )
    return ctx.response.created({ data: movement })
  }

  async update(ctx: HttpContext) {
    const input = await updateMovementValidator.validate(ctx.request.all())
    const service = await app.container.make(MovementService)
    const movement = await service.update(
      requireTenantId(ctx),
      Number(ctx.params.id),
      ctx.auth.getUserOrFail().id,
      input
    )
    return ctx.response.ok({ data: movement })
  }

  async destroy(ctx: HttpContext) {
    const service = await app.container.make(MovementService)
    await service.delete(requireTenantId(ctx), Number(ctx.params.id), ctx.auth.getUserOrFail().id)
    return ctx.response.noContent()
  }
}
