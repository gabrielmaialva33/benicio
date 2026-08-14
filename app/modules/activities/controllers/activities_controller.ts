import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import { requireTenantId } from '#shared/http/tenant_context'
import ActivityService from '#modules/activities/services/activity_service'
import { listActivitiesValidator } from '#modules/activities/validators/activity_validators'

export default class ActivitiesController {
  async indexForFolder(ctx: HttpContext) {
    const input = await listActivitiesValidator.validate(ctx.request.qs())
    const service = await app.container.make(ActivityService)
    const result = await service.listForFolder(
      requireTenantId(ctx),
      Number(ctx.params.folderId),
      input
    )
    return ctx.response.ok(result)
  }

  async indexForProcess(ctx: HttpContext) {
    const input = await listActivitiesValidator.validate(ctx.request.qs())
    const service = await app.container.make(ActivityService)
    const result = await service.listForProcess(
      requireTenantId(ctx),
      Number(ctx.params.processId),
      input
    )
    return ctx.response.ok(result)
  }
}
