import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import { requireTenantId } from '#shared/http/tenant_context'
import HearingService from '#modules/hearings/services/hearing_service'
import {
  createHearingValidator,
  listHearingsValidator,
  updateHearingStatusValidator,
  updateHearingValidator,
} from '#modules/hearings/validators/hearing_validators'

export default class HearingsController {
  async index(ctx: HttpContext) {
    const input = await listHearingsValidator.validate(ctx.request.qs())
    const service = await app.container.make(HearingService)
    return ctx.response.ok(await service.list(requireTenantId(ctx), input))
  }

  async show(ctx: HttpContext) {
    const service = await app.container.make(HearingService)
    return ctx.response.ok({ data: await service.get(requireTenantId(ctx), Number(ctx.params.id)) })
  }

  async store(ctx: HttpContext) {
    const input = await createHearingValidator.validate(ctx.request.all())
    return this.create(ctx, input)
  }

  async storeForProcess(ctx: HttpContext) {
    const input = await createHearingValidator.validate({
      ...ctx.request.all(),
      process_id: Number(ctx.params.processId),
    })
    return this.create(ctx, input)
  }

  async update(ctx: HttpContext) {
    const input = await updateHearingValidator.validate(ctx.request.all())
    const service = await app.container.make(HearingService)
    const hearing = await service.update(requireTenantId(ctx), Number(ctx.params.id), input)
    return ctx.response.ok({ data: hearing })
  }

  async updateStatus(ctx: HttpContext) {
    const input = await updateHearingStatusValidator.validate(ctx.request.all())
    const service = await app.container.make(HearingService)
    const hearing = await service.update(requireTenantId(ctx), Number(ctx.params.id), input)
    return ctx.response.ok({ data: hearing })
  }

  async destroy(ctx: HttpContext) {
    const service = await app.container.make(HearingService)
    await service.delete(requireTenantId(ctx), Number(ctx.params.id))
    return ctx.response.noContent()
  }

  private async create(
    ctx: HttpContext,
    input: Awaited<ReturnType<typeof createHearingValidator.validate>>
  ) {
    const service = await app.container.make(HearingService)
    const hearing = await service.create(requireTenantId(ctx), ctx.auth.getUserOrFail().id, input)
    return ctx.response.created({ data: hearing })
  }
}
