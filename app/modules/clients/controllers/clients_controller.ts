import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import { requireTenantId } from '#shared/http/tenant_context'
import ClientService from '#modules/clients/services/client_service'
import {
  createClientValidator,
  listClientsValidator,
  updateClientValidator,
} from '#modules/clients/validators/client_validators'

export default class ClientsController {
  async index(ctx: HttpContext) {
    const input = await listClientsValidator.validate(ctx.request.qs())
    const service = await app.container.make(ClientService)
    const clients = await service.list(requireTenantId(ctx), input)

    return ctx.response.json(clients)
  }

  async show(ctx: HttpContext) {
    const service = await app.container.make(ClientService)
    const client = await service.get(requireTenantId(ctx), Number(ctx.params.id))

    return ctx.response.json({ data: client })
  }

  async store(ctx: HttpContext) {
    const input = await createClientValidator.validate(ctx.request.all())
    const service = await app.container.make(ClientService)
    const client = await service.create(requireTenantId(ctx), input)

    return ctx.response.created({ data: client })
  }

  async update(ctx: HttpContext) {
    const input = await updateClientValidator.validate(ctx.request.all())
    const service = await app.container.make(ClientService)
    const client = await service.update(requireTenantId(ctx), Number(ctx.params.id), input)

    return ctx.response.json({ data: client })
  }

  async destroy(ctx: HttpContext) {
    const service = await app.container.make(ClientService)
    await service.delete(requireTenantId(ctx), Number(ctx.params.id))

    return ctx.response.noContent()
  }
}
