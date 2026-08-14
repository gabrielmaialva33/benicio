import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import { requireTenantId } from '#shared/http/tenant_context'
import TaskService from '#modules/tasks/services/task_service'
import {
  createTaskValidator,
  listTasksValidator,
  updateTaskStatusValidator,
  updateTaskValidator,
} from '#modules/tasks/validators/task_validators'

export default class TasksController {
  async index(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(listTasksValidator)
    const service = await app.container.make(TaskService)
    return ctx.response.ok(await service.list(requireTenantId(ctx), input))
  }

  async show(ctx: HttpContext) {
    const service = await app.container.make(TaskService)
    return ctx.response.ok({ data: await service.get(requireTenantId(ctx), Number(ctx.params.id)) })
  }

  async store(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(createTaskValidator)
    const service = await app.container.make(TaskService)
    const task = await service.create(requireTenantId(ctx), ctx.auth.getUserOrFail().id, input)
    return ctx.response.created({ data: task })
  }

  async update(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(updateTaskValidator)
    const service = await app.container.make(TaskService)
    const task = await service.update(requireTenantId(ctx), Number(ctx.params.id), input)
    return ctx.response.ok({ data: task })
  }

  async updateStatus(ctx: HttpContext) {
    const { status } = await ctx.request.validateUsing(updateTaskStatusValidator)
    const service = await app.container.make(TaskService)
    const task = await service.updateStatus(requireTenantId(ctx), Number(ctx.params.id), status)
    return ctx.response.ok({ data: task })
  }

  async destroy(ctx: HttpContext) {
    const service = await app.container.make(TaskService)
    await service.delete(requireTenantId(ctx), Number(ctx.params.id))
    return ctx.response.noContent()
  }
}
