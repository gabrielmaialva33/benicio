import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import IPermission from '#modules/permissions/interfaces/permission_interface'

const TasksController = () => import('#modules/tasks/controllers/tasks_controller')
const permission = (action: IPermission.Actions) =>
  middleware.permission({ permissions: `${IPermission.Resources.TASKS}.${action}` })

router
  .group(() => {
    router.get('/', [TasksController, 'index']).use(permission(IPermission.Actions.LIST))
    router
      .get('/:id', [TasksController, 'show'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.READ))
    router.post('/', [TasksController, 'store']).use(permission(IPermission.Actions.CREATE))
    router
      .put('/:id', [TasksController, 'update'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.UPDATE))
    router
      .patch('/:id/status', [TasksController, 'updateStatus'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.UPDATE))
    router
      .delete('/:id', [TasksController, 'destroy'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.DELETE))
  })
  .use([middleware.auth(), middleware.tenant({ required: true }), apiThrottle])
  .prefix('/api/v1/tasks')
  .as('tasks')
