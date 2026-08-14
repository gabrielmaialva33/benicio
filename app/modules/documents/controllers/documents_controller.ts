import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import { requireTenantId } from '#shared/http/tenant_context'
import DocumentService from '#modules/documents/services/document_service'
import {
  createDocumentValidator,
  listDocumentsValidator,
  updateDocumentValidator,
} from '#modules/documents/validators/document_validators'

export default class DocumentsController {
  async index(ctx: HttpContext) {
    const input = await listDocumentsValidator.validate(ctx.request.qs())
    const service = await app.container.make(DocumentService)
    return ctx.response.ok(await service.list(requireTenantId(ctx), input))
  }

  async indexForFolder(ctx: HttpContext) {
    const input = await listDocumentsValidator.validate({
      ...ctx.request.qs(),
      folder_id: Number(ctx.params.folderId),
    })
    const service = await app.container.make(DocumentService)
    return ctx.response.ok(await service.list(requireTenantId(ctx), input))
  }

  async indexForProcess(ctx: HttpContext) {
    const input = await listDocumentsValidator.validate({
      ...ctx.request.qs(),
      process_id: Number(ctx.params.processId),
    })
    const service = await app.container.make(DocumentService)
    return ctx.response.ok(await service.list(requireTenantId(ctx), input))
  }

  async show(ctx: HttpContext) {
    const service = await app.container.make(DocumentService)
    return ctx.response.ok({ data: await service.get(requireTenantId(ctx), Number(ctx.params.id)) })
  }

  async store(ctx: HttpContext) {
    const input = await createDocumentValidator.validate(ctx.request.all())
    return this.create(ctx, input)
  }

  async storeForFolder(ctx: HttpContext) {
    const input = await createDocumentValidator.validate({
      ...ctx.request.all(),
      folder_id: Number(ctx.params.folderId),
    })
    return this.create(ctx, input)
  }

  async update(ctx: HttpContext) {
    const input = await updateDocumentValidator.validate(ctx.request.all())
    const service = await app.container.make(DocumentService)
    const document = await service.update(
      requireTenantId(ctx),
      Number(ctx.params.id),
      ctx.auth.getUserOrFail().id,
      input
    )
    return ctx.response.ok({ data: document })
  }

  async destroy(ctx: HttpContext) {
    const service = await app.container.make(DocumentService)
    await service.delete(requireTenantId(ctx), Number(ctx.params.id), ctx.auth.getUserOrFail().id)
    return ctx.response.noContent()
  }

  private async create(
    ctx: HttpContext,
    input: Awaited<ReturnType<typeof createDocumentValidator.validate>>
  ) {
    const service = await app.container.make(DocumentService)
    const document = await service.create(requireTenantId(ctx), ctx.auth.getUserOrFail().id, input)
    return ctx.response.created({ data: document })
  }
}
