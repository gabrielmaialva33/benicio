import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import { requireTenantId } from '#shared/http/tenant_context'
import ProcessService from '#modules/processes/services/process_service'
import {
  createProcessValidator,
  listProcessesValidator,
  updateProcessValidator,
} from '#modules/processes/validators/process_validators'

export default class ProcessesController {
  async index(ctx: HttpContext) {
    const input = await listProcessesValidator.validate(ctx.request.qs())
    const service = await app.container.make(ProcessService)
    const processes = await service.list(requireTenantId(ctx), input)

    return ctx.response.json(processes)
  }

  async indexForFolder(ctx: HttpContext) {
    const input = await listProcessesValidator.validate(ctx.request.qs())
    const service = await app.container.make(ProcessService)
    const processes = await service.listForFolder(
      requireTenantId(ctx),
      Number(ctx.params.folderId),
      input
    )

    return ctx.response.json(processes)
  }

  async show(ctx: HttpContext) {
    const service = await app.container.make(ProcessService)
    const process = await service.get(requireTenantId(ctx), Number(ctx.params.id))

    return ctx.response.json({ data: process })
  }

  async store(ctx: HttpContext) {
    const input = await createProcessValidator.validate(ctx.request.all())
    const service = await app.container.make(ProcessService)
    const process = await service.create(requireTenantId(ctx), Number(ctx.params.folderId), input)

    return ctx.response.created({ data: process })
  }

  async update(ctx: HttpContext) {
    const input = await updateProcessValidator.validate(ctx.request.all())
    const service = await app.container.make(ProcessService)
    const process = await service.update(requireTenantId(ctx), Number(ctx.params.id), input)

    return ctx.response.json({ data: process })
  }

  async markPrimary(ctx: HttpContext) {
    const service = await app.container.make(ProcessService)
    const process = await service.markPrimary(requireTenantId(ctx), Number(ctx.params.id))

    return ctx.response.json({ data: process })
  }

  async destroy(ctx: HttpContext) {
    const service = await app.container.make(ProcessService)
    await service.delete(requireTenantId(ctx), Number(ctx.params.id))

    return ctx.response.noContent()
  }
}
