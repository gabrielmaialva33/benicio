import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import { requireTenantId } from '#shared/http/tenant_context'
import DeadlineService from '#modules/deadlines/services/deadline_service'
import {
  completeDeadlineValidator,
  createDeadlineValidator,
  listDeadlinesValidator,
  updateDeadlineValidator,
} from '#modules/deadlines/validators/deadline_validators'

export default class DeadlinesController {
  async index(ctx: HttpContext) {
    const input = await listDeadlinesValidator.validate(ctx.request.qs())
    const service = await app.container.make(DeadlineService)
    return ctx.response.ok(await service.list(requireTenantId(ctx), input))
  }

  async show(ctx: HttpContext) {
    const service = await app.container.make(DeadlineService)
    return ctx.response.ok({ data: await service.get(requireTenantId(ctx), Number(ctx.params.id)) })
  }

  async store(ctx: HttpContext) {
    const input = await createDeadlineValidator.validate(ctx.request.all())
    const service = await app.container.make(DeadlineService)
    const deadline = await service.create(requireTenantId(ctx), ctx.auth.getUserOrFail().id, input)
    return ctx.response.created({ data: deadline })
  }

  async update(ctx: HttpContext) {
    const input = await updateDeadlineValidator.validate(ctx.request.all())
    const service = await app.container.make(DeadlineService)
    const deadline = await service.update(requireTenantId(ctx), Number(ctx.params.id), input)
    return ctx.response.ok({ data: deadline })
  }

  async complete(ctx: HttpContext) {
    const { completed = true } = await completeDeadlineValidator.validate(ctx.request.all())
    const service = await app.container.make(DeadlineService)
    const deadline = await service.complete(requireTenantId(ctx), Number(ctx.params.id), completed)
    return ctx.response.ok({ data: deadline })
  }

  async destroy(ctx: HttpContext) {
    const service = await app.container.make(DeadlineService)
    await service.delete(requireTenantId(ctx), Number(ctx.params.id))
    return ctx.response.noContent()
  }
}
