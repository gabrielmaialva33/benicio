import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import IPermission from '#modules/permissions/interfaces/permission_interface'

const ProcessesController = () => import('#modules/processes/controllers/processes_controller')

router
  .group(() => {
    router
      .get('/', [ProcessesController, 'index'])
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.PROCESSES}.${IPermission.Actions.LIST}`,
        })
      )
      .as('processes.index')

    router
      .get('/:id', [ProcessesController, 'show'])
      .where('id', /^[0-9]+$/)
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.PROCESSES}.${IPermission.Actions.READ}`,
        })
      )
      .as('processes.show')

    router
      .put('/:id', [ProcessesController, 'update'])
      .where('id', /^[0-9]+$/)
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.PROCESSES}.${IPermission.Actions.UPDATE}`,
        })
      )
      .as('processes.update')

    router
      .put('/:id/primary', [ProcessesController, 'markPrimary'])
      .where('id', /^[0-9]+$/)
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.PROCESSES}.${IPermission.Actions.UPDATE}`,
        })
      )
      .as('processes.primary')

    router
      .delete('/:id', [ProcessesController, 'destroy'])
      .where('id', /^[0-9]+$/)
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.PROCESSES}.${IPermission.Actions.DELETE}`,
        })
      )
      .as('processes.destroy')
  })
  .use([middleware.auth(), middleware.tenant({ required: true }), apiThrottle])
  .prefix('/api/v1/processes')

router
  .group(() => {
    router
      .get('/', [ProcessesController, 'indexForFolder'])
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.PROCESSES}.${IPermission.Actions.LIST}`,
        })
      )
      .as('folders.processes.index')

    router
      .post('/', [ProcessesController, 'store'])
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.PROCESSES}.${IPermission.Actions.CREATE}`,
        })
      )
      .as('folders.processes.store')
  })
  .where('folderId', /^[0-9]+$/)
  .use([middleware.auth(), middleware.tenant({ required: true }), apiThrottle])
  .prefix('/api/v1/folders/:folderId/processes')
