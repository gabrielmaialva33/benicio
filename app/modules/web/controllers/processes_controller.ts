import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import ConflictException from '#exceptions/conflict_exception'
import ValidationException from '#exceptions/validation_exception'
import ProcessService from '#modules/processes/services/process_service'
import {
  createProcessValidator,
  updateProcessValidator,
} from '#modules/processes/validators/process_validators'
import ProcessPageService from '#modules/web/services/process_page_service'
import { inertiaRedirectBack, inertiaRedirectTo } from '#shared/http/inertia_redirect'
import { requireTenantId } from '#shared/http/tenant_context'

@inject()
export default class InertiaProcessesController {
  constructor(
    private processPageService: ProcessPageService,
    private processService: ProcessService
  ) {}

  async create(ctx: HttpContext) {
    const page = await this.processPageService.form(
      requireTenantId(ctx),
      Number(ctx.params.folderId)
    )

    return ctx.inertia.render('processes/create', page)
  }

  async store(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(createProcessValidator)
    const tenantId = requireTenantId(ctx)
    const folderId = Number(ctx.params.folderId)

    try {
      const process = await this.processService.create(tenantId, folderId, input)
      ctx.session.flash('success', 'Processo cadastrado com sucesso.')
      return inertiaRedirectTo(ctx, this.processPath(folderId, process.id))
    } catch (error) {
      return this.handleWriteError(ctx, error)
    }
  }

  async show(ctx: HttpContext) {
    const page = await this.processPageService.detail(
      requireTenantId(ctx),
      Number(ctx.params.folderId),
      Number(ctx.params.id)
    )

    return ctx.inertia.render('processes/show', page)
  }

  async edit(ctx: HttpContext) {
    const page = await this.processPageService.form(
      requireTenantId(ctx),
      Number(ctx.params.folderId),
      Number(ctx.params.id)
    )

    return ctx.inertia.render('processes/edit', page)
  }

  async update(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(updateProcessValidator)
    const tenantId = requireTenantId(ctx)
    const folderId = Number(ctx.params.folderId)
    const processId = Number(ctx.params.id)

    try {
      await this.processService.updateForFolder(tenantId, folderId, processId, input)
      ctx.session.flash('success', 'Processo atualizado com sucesso.')
      return inertiaRedirectTo(ctx, this.processPath(folderId, processId))
    } catch (error) {
      return this.handleWriteError(ctx, error)
    }
  }

  async markPrimary(ctx: HttpContext) {
    const tenantId = requireTenantId(ctx)
    const folderId = Number(ctx.params.folderId)
    const processId = Number(ctx.params.id)

    await this.processService.markPrimaryForFolder(tenantId, folderId, processId)
    ctx.session.flash('success', 'Processo definido como principal da pasta.')
    return inertiaRedirectTo(ctx, this.processPath(folderId, processId))
  }

  async destroy(ctx: HttpContext) {
    const tenantId = requireTenantId(ctx)
    const folderId = Number(ctx.params.folderId)
    const processId = Number(ctx.params.id)

    await this.processService.deleteForFolder(tenantId, folderId, processId)
    ctx.session.flash('success', 'Processo removido com sucesso.')
    return inertiaRedirectTo(ctx, `/folders/${folderId}`)
  }

  private handleWriteError(ctx: HttpContext, error: unknown) {
    if (error instanceof ConflictException) {
      return this.redirectWithError(ctx, 'cnj_number', 'Já existe um processo ativo com este CNJ.')
    }
    if (error instanceof ValidationException) {
      if (error.message.includes('CNJ number is invalid')) {
        return this.redirectWithError(ctx, 'cnj_number', 'O número CNJ informado é inválido.')
      }
      if (error.message.includes('requires a CNJ')) {
        return this.redirectWithError(
          ctx,
          'internal_code',
          'Informe o número CNJ, o número legado ou o código interno.'
        )
      }
      if (error.message.includes('party') || error.message.includes('primary party')) {
        return this.redirectWithError(ctx, 'parties', 'Revise os dados e as partes principais.')
      }
      return this.redirectWithError(ctx, 'general', error.message)
    }
    throw error
  }

  private redirectWithError(ctx: HttpContext, field: string, message: string) {
    ctx.session.flashAll()
    ctx.session.flash('inputErrorsBag', { [field]: [message] })
    return inertiaRedirectBack(ctx)
  }

  private processPath(folderId: number, processId: number) {
    return `/folders/${folderId}/processes/${processId}`
  }
}
