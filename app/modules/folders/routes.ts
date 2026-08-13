import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import IPermission from '#modules/permissions/interfaces/permission_interface'

const FoldersController = () => import('#modules/folders/controllers/folders_controller')

router
  .group(() => {
    router
      .get('/', [FoldersController, 'index'])
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.FOLDERS}.${IPermission.Actions.LIST}`,
        })
      )
      .as('folders.index')

    router
      .get('/:id', [FoldersController, 'show'])
      .where('id', /^[0-9]+$/)
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.FOLDERS}.${IPermission.Actions.READ}`,
        })
      )
      .as('folders.show')

    router
      .post('/', [FoldersController, 'store'])
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.FOLDERS}.${IPermission.Actions.CREATE}`,
        })
      )
      .as('folders.store')

    router
      .put('/:id', [FoldersController, 'update'])
      .where('id', /^[0-9]+$/)
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.FOLDERS}.${IPermission.Actions.UPDATE}`,
        })
      )
      .as('folders.update')

    router
      .delete('/:id', [FoldersController, 'destroy'])
      .where('id', /^[0-9]+$/)
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.FOLDERS}.${IPermission.Actions.DELETE}`,
        })
      )
      .as('folders.destroy')
  })
  .use([middleware.auth(), middleware.tenant({ required: true }), apiThrottle])
  .prefix('/api/v1/folders')
