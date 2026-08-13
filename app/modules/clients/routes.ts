import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import IPermission from '#modules/permissions/interfaces/permission_interface'

const ClientsController = () => import('#modules/clients/controllers/clients_controller')

router
  .group(() => {
    router
      .get('/', [ClientsController, 'index'])
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.CLIENTS}.${IPermission.Actions.LIST}`,
        })
      )
      .as('clients.index')

    router
      .get('/:id', [ClientsController, 'show'])
      .where('id', /^[0-9]+$/)
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.CLIENTS}.${IPermission.Actions.READ}`,
        })
      )
      .as('clients.show')

    router
      .post('/', [ClientsController, 'store'])
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.CLIENTS}.${IPermission.Actions.CREATE}`,
        })
      )
      .as('clients.store')

    router
      .put('/:id', [ClientsController, 'update'])
      .where('id', /^[0-9]+$/)
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.CLIENTS}.${IPermission.Actions.UPDATE}`,
        })
      )
      .as('clients.update')

    router
      .delete('/:id', [ClientsController, 'destroy'])
      .where('id', /^[0-9]+$/)
      .use(
        middleware.permission({
          permissions: `${IPermission.Resources.CLIENTS}.${IPermission.Actions.DELETE}`,
        })
      )
      .as('clients.destroy')
  })
  .use([middleware.auth(), middleware.tenant({ required: true }), apiThrottle])
  .prefix('/api/v1/clients')
