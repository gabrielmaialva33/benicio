import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import ConflictException from '#exceptions/conflict_exception'
import ValidationException from '#exceptions/validation_exception'
import ClientService from '#modules/clients/services/client_service'
import {
  createClientValidator,
  listClientsValidator,
  updateClientValidator,
} from '#modules/clients/validators/client_validators'
import ClientPageService from '#modules/web/services/client_page_service'
import { requireTenantId } from '#shared/http/tenant_context'

export default class InertiaClientsController {
  async index(ctx: HttpContext) {
    const input = await listClientsValidator.validate(ctx.request.qs())
    const service = await app.container.make(ClientPageService)
    const page = await service.index(requireTenantId(ctx), input)

    return ctx.inertia.render('clients/index', page)
  }

  async create(ctx: HttpContext) {
    return ctx.inertia.render('clients/create', {})
  }

  async store(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(createClientValidator)
    const service = await app.container.make(ClientService)

    try {
      const client = await service.create(requireTenantId(ctx), input)
      ctx.session.flash('success', `Cliente ${client.name} cadastrado com sucesso.`)
      return ctx.response.redirect().toPath(`/clients/${client.id}`)
    } catch (error) {
      return this.handleWriteError(ctx, error)
    }
  }

  async show(ctx: HttpContext) {
    const service = await app.container.make(ClientPageService)
    const page = await service.detail(requireTenantId(ctx), Number(ctx.params.id))

    return ctx.inertia.render('clients/show', page)
  }

  async edit(ctx: HttpContext) {
    const service = await app.container.make(ClientPageService)
    const page = await service.detail(requireTenantId(ctx), Number(ctx.params.id))

    return ctx.inertia.render('clients/edit', { client: page.client })
  }

  async update(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(updateClientValidator)
    const service = await app.container.make(ClientService)

    try {
      const client = await service.update(requireTenantId(ctx), Number(ctx.params.id), input)
      ctx.session.flash('success', `Cliente ${client.name} atualizado com sucesso.`)
      return ctx.response.redirect().toPath(`/clients/${client.id}`)
    } catch (error) {
      return this.handleWriteError(ctx, error)
    }
  }

  async destroy(ctx: HttpContext) {
    const service = await app.container.make(ClientService)

    try {
      await service.delete(requireTenantId(ctx), Number(ctx.params.id))
      ctx.session.flash('success', 'Cliente removido com sucesso.')
      return ctx.response.redirect().toPath('/clients')
    } catch (error) {
      if (error instanceof ConflictException) {
        ctx.session.flash(
          'error',
          'Este cliente possui pastas ativas. Remova ou transfira essas pastas antes de excluí-lo.'
        )
        return ctx.response.redirect().back()
      }
      throw error
    }
  }

  private handleWriteError(ctx: HttpContext, error: unknown) {
    if (error instanceof ConflictException) {
      return this.redirectWithError(ctx, 'document', 'Já existe um cliente ativo com este documento.')
    }
    if (error instanceof ValidationException) {
      return this.redirectWithError(ctx, 'document', error.message)
    }
    throw error
  }

  private redirectWithError(ctx: HttpContext, field: string, message: string) {
    ctx.session.flashAll()
    ctx.session.flash('inputErrorsBag', { [field]: [message] })
    return ctx.response.redirect().back()
  }
}
