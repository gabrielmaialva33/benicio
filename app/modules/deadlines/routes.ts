import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import IPermission from '#modules/permissions/interfaces/permission_interface'

const DeadlinesController = () => import('#modules/deadlines/controllers/deadlines_controller')
const permission = (action: IPermission.Actions) =>
  middleware.permission({ permissions: `${IPermission.Resources.DEADLINES}.${action}` })

router
  .group(() => {
    router.get('/', [DeadlinesController, 'index']).use(permission(IPermission.Actions.LIST))
    router
      .get('/:id', [DeadlinesController, 'show'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.READ))
    router.post('/', [DeadlinesController, 'store']).use(permission(IPermission.Actions.CREATE))
    router
      .put('/:id', [DeadlinesController, 'update'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.UPDATE))
    router
      .patch('/:id/complete', [DeadlinesController, 'complete'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.UPDATE))
    router
      .delete('/:id', [DeadlinesController, 'destroy'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.DELETE))
  })
  .use([middleware.auth(), middleware.tenant({ required: true }), apiThrottle])
  .prefix('/api/v1/deadlines')
  .as('deadlines')
