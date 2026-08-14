import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import IPermission from '#modules/permissions/interfaces/permission_interface'

const DocumentsController = () => import('#modules/documents/controllers/documents_controller')
const permission = (action: IPermission.Actions) =>
  middleware.permission({ permissions: `${IPermission.Resources.DOCUMENTS}.${action}` })
const common = [middleware.auth(), middleware.tenant({ required: true }), apiThrottle]

router
  .group(() => {
    router.get('/', [DocumentsController, 'index']).use(permission(IPermission.Actions.LIST))
    router
      .get('/:id', [DocumentsController, 'show'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.READ))
    router.post('/', [DocumentsController, 'store']).use(permission(IPermission.Actions.CREATE))
    router
      .put('/:id', [DocumentsController, 'update'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.UPDATE))
    router
      .delete('/:id', [DocumentsController, 'destroy'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.DELETE))
  })
  .use(common)
  .prefix('/api/v1/documents')
  .as('documents')

router
  .group(() => {
    router
      .get('/', [DocumentsController, 'indexForFolder'])
      .use(permission(IPermission.Actions.LIST))
    router
      .post('/', [DocumentsController, 'storeForFolder'])
      .use(permission(IPermission.Actions.CREATE))
  })
  .where('folderId', /^[0-9]+$/)
  .use(common)
  .prefix('/api/v1/folders/:folderId/documents')
  .as('folders.documents')

router
  .get('/api/v1/processes/:processId/documents', [DocumentsController, 'indexForProcess'])
  .where('processId', /^[0-9]+$/)
  .use([...common, permission(IPermission.Actions.LIST)])
  .as('processes.documents.index')
