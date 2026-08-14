import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { aiThrottle } from '#start/limiter'
import IPermission from '#modules/permissions/interfaces/permission_interface'

const AiChatController = () => import('#modules/ai/controllers/ai_chat_controller')
const permission = (action: IPermission.Actions) =>
  middleware.permission({ permissions: `${IPermission.Resources.AI}.${action}` })

router
  .group(() => {
    router.post('/chat', [AiChatController, 'chat']).use(permission(IPermission.Actions.CREATE))
    router
      .post('/chat/stream', [AiChatController, 'stream'])
      .use(permission(IPermission.Actions.CREATE))
    router
      .get('/conversations', [AiChatController, 'conversations'])
      .use(permission(IPermission.Actions.LIST))
    router
      .get('/conversations/:id', [AiChatController, 'conversation'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.READ))
    router
      .delete('/conversations/:id', [AiChatController, 'destroyConversation'])
      .where('id', /^[0-9]+$/)
      .use(permission(IPermission.Actions.DELETE))
  })
  .use([middleware.auth(), middleware.tenant({ required: true }), aiThrottle])
  .prefix('/api/v1/ai')
  .as('ai')
