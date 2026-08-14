import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import IPermission from '#modules/permissions/interfaces/permission_interface'

const NotificationsController = () =>
  import('#modules/notifications/controllers/notifications_controller')
const permission = (action: IPermission.Actions) =>
  middleware.permission({ permissions: `${IPermission.Resources.NOTIFICATIONS}.${action}` })

router
  .group(() => {
    router.get('/', [NotificationsController, 'index']).use(permission(IPermission.Actions.LIST))
    router
      .get('/recent', [NotificationsController, 'recent'])
      .use(permission(IPermission.Actions.LIST))
    router
      .get('/unread-count', [NotificationsController, 'unreadCount'])
      .use(permission(IPermission.Actions.READ))
    router
      .put('/read-all', [NotificationsController, 'markAllRead'])
      .use(permission(IPermission.Actions.UPDATE))
    router
      .get('/:id', [NotificationsController, 'show'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.READ))
    router.post('/', [NotificationsController, 'store']).use(permission(IPermission.Actions.CREATE))
    router
      .put('/:id/read', [NotificationsController, 'markRead'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.UPDATE))
    router
      .delete('/:id', [NotificationsController, 'destroy'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.DELETE))
  })
  .use([middleware.auth(), middleware.tenant({ required: true }), apiThrottle])
  .prefix('/api/v1/notifications')
  .as('notifications')
