import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import IPermission from '#modules/permissions/interfaces/permission_interface'

const ActivitiesController = () => import('#modules/activities/controllers/activities_controller')
const readMovements = middleware.permission({
  permissions: `${IPermission.Resources.MOVEMENTS}.${IPermission.Actions.READ}`,
})
const common = [
  middleware.auth(),
  middleware.tenant({ required: true }),
  apiThrottle,
  readMovements,
]

router
  .get('/api/v1/folders/:folderId/activities', [ActivitiesController, 'indexForFolder'])
  .where('folderId', /^[0-9]+$/)
  .use(common)
  .as('folders.activities.index')

router
  .get('/api/v1/processes/:processId/activities', [ActivitiesController, 'indexForProcess'])
  .where('processId', /^[0-9]+$/)
  .use(common)
  .as('processes.activities.index')
