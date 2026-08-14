import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import IPermission from '#modules/permissions/interfaces/permission_interface'

const HearingsController = () => import('#modules/hearings/controllers/hearings_controller')
const permission = (action: IPermission.Actions) =>
  middleware.permission({ permissions: `${IPermission.Resources.HEARINGS}.${action}` })
const common = [middleware.auth(), middleware.tenant({ required: true }), apiThrottle]

router
  .group(() => {
    router.get('/', [HearingsController, 'index']).use(permission(IPermission.Actions.LIST))
    router
      .get('/:id', [HearingsController, 'show'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.READ))
    router.post('/', [HearingsController, 'store']).use(permission(IPermission.Actions.CREATE))
    router
      .put('/:id', [HearingsController, 'update'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.UPDATE))
    router
      .patch('/:id/status', [HearingsController, 'updateStatus'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.UPDATE))
    router
      .delete('/:id', [HearingsController, 'destroy'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.DELETE))
  })
  .use(common)
  .prefix('/api/v1/hearings')
  .as('hearings')

router
  .post('/api/v1/processes/:processId/hearings', [HearingsController, 'storeForProcess'])
  .where('processId', /^[0-9]+$/)
  .use([...common, permission(IPermission.Actions.CREATE)])
  .as('processes.hearings.store')
