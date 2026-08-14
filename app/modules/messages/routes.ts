import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import IPermission from '#modules/permissions/interfaces/permission_interface'

const MessagesController = () => import('#modules/messages/controllers/messages_controller')
const permission = (action: IPermission.Actions) =>
  middleware.permission({ permissions: `${IPermission.Resources.MESSAGES}.${action}` })

router
  .group(() => {
    router.get('/', [MessagesController, 'index']).use(permission(IPermission.Actions.LIST))
    router.get('/recent', [MessagesController, 'recent']).use(permission(IPermission.Actions.LIST))
    router
      .get('/unread-count', [MessagesController, 'unreadCount'])
      .use(permission(IPermission.Actions.READ))
    router
      .put('/read-all', [MessagesController, 'markAllRead'])
      .use(permission(IPermission.Actions.UPDATE))
    router
      .get('/:id', [MessagesController, 'show'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.READ))
    router.post('/', [MessagesController, 'store']).use(permission(IPermission.Actions.CREATE))
    router
      .put('/:id/read', [MessagesController, 'markRead'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.UPDATE))
    router
      .delete('/:id', [MessagesController, 'destroy'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.DELETE))
  })
  .use([middleware.auth(), middleware.tenant({ required: true }), apiThrottle])
  .prefix('/api/v1/messages')
  .as('messages')
