import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { createHash } from 'node:crypto'

import ConflictException from '#exceptions/conflict_exception'
import NotFoundException from '#exceptions/not_found_exception'
import FolderService from '#modules/folders/services/folder_service'
import {
  createFolderValidator,
  listFoldersValidator,
} from '#modules/folders/validators/folder_validators'
import FolderPageService from '#modules/web/services/folder_page_service'
import { inertiaRedirectBack, inertiaRedirectTo } from '#shared/http/inertia_redirect'
import { requireTenantId } from '#shared/http/tenant_context'

@inject()
export default class InertiaFoldersController {
  constructor(
    private folderPageService: FolderPageService,
    private folderService: FolderService
  ) {}

  async index(ctx: HttpContext) {
    const input = await listFoldersValidator.validate(ctx.request.qs())
    const page = await this.folderPageService.index(requireTenantId(ctx), input)

    return ctx.inertia.render('folders/index', page)
  }

  async create(ctx: HttpContext) {
    const options = await this.folderPageService.formOptions(requireTenantId(ctx))
    const requestedClientId = Number(ctx.request.input('client_id'))
    const selectedClientId =
      Number.isSafeInteger(requestedClientId) &&
      options.clients.some((client) => client.id === requestedClientId)
        ? requestedClientId
        : null

    return ctx.inertia.render('folders/create', {
      ...options,
      selected_client_id: selectedClientId,
    })
  }

  async store(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(createFolderValidator)
    try {
      const folder = await this.folderService.create(requireTenantId(ctx), input)
      ctx.session.flash('success', `Pasta ${folder.code} criada com sucesso.`)
      ctx.logger.info(
        {
          session_hash: createHash('sha256').update(ctx.session.sessionId).digest('hex'),
          response_flash: ctx.session.responseFlashMessages.all(),
        },
        'folder store session diagnostic'
      )
      ctx.session.put('_folder_debug', 'store-reached')
      const commit = ctx.session.commit.bind(ctx.session)
      ctx.session.commit = async () => {
        ctx.session.put('_folder_commit_flash', ctx.session.responseFlashMessages.all())
        await commit()
      }
      return inertiaRedirectTo(ctx, `/folders/${folder.id}`)
    } catch (error) {
      if (error instanceof ConflictException) {
        return this.redirectWithError(ctx, 'code', 'Já existe uma pasta ativa com este código.')
      }
      if (error instanceof NotFoundException) {
        const field = error.message.includes('Client') ? 'client_id' : 'responsible_lawyer_id'
        const message =
          field === 'client_id'
            ? 'O cliente selecionado não pertence ao escritório ativo.'
            : 'O responsável selecionado não pertence ao escritório ativo.'
        return this.redirectWithError(ctx, field, message)
      }
      throw error
    }
  }

  async show(ctx: HttpContext) {
    ctx.logger.info(
      {
        session_hash: createHash('sha256').update(ctx.session.sessionId).digest('hex'),
        flash: ctx.session.flashMessages.all(),
        session_keys: Object.keys(ctx.session.all()),
      },
      'folder show session diagnostic'
    )
    throw new Error(
      JSON.stringify({
        session_hash: createHash('sha256').update(ctx.session.sessionId).digest('hex'),
        flash: ctx.session.flashMessages.all(),
        session: ctx.session.all(),
      })
    )
    const page = await this.folderPageService.detail(requireTenantId(ctx), Number(ctx.params.id))

    return ctx.inertia.render('folders/show', page)
  }

  private redirectWithError(ctx: HttpContext, field: string, message: string) {
    ctx.session.flashAll()
    ctx.session.flash('inputErrorsBag', { [field]: [message] })
    return inertiaRedirectBack(ctx)
  }
}
