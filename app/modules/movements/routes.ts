import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import IPermission from '#modules/permissions/interfaces/permission_interface'

const MovementsController = () => import('#modules/movements/controllers/movements_controller')
const permission = (action: IPermission.Actions) =>
  middleware.permission({ permissions: `${IPermission.Resources.MOVEMENTS}.${action}` })
const common = [middleware.auth(), middleware.tenant({ required: true }), apiThrottle]

router
  .group(() => {
    router.get('/', [MovementsController, 'index']).use(permission(IPermission.Actions.LIST))
    router
      .get('/:id', [MovementsController, 'show'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.READ))
    router
      .put('/:id', [MovementsController, 'update'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.UPDATE))
    router
      .delete('/:id', [MovementsController, 'destroy'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.DELETE))
  })
  .use(common)
  .prefix('/api/v1/movements')
  .as('movements')

router
  .group(() => {
    router
      .get('/', [MovementsController, 'indexForProcess'])
      .use(permission(IPermission.Actions.LIST))
    router
      .post('/', [MovementsController, 'storeForProcess'])
      .use(permission(IPermission.Actions.CREATE))
  })
  .where('processId', /^[0-9]+$/)
  .use(common)
  .prefix('/api/v1/processes/:processId/movements')
  .as('processes.movements')

router
  .get('/api/v1/folders/:folderId/movements', [MovementsController, 'indexForFolder'])
  .where('folderId', /^[0-9]+$/)
  .use([...common, permission(IPermission.Actions.LIST)])
  .as('folders.movements.index')
