import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import transmit from '@adonisjs/transmit/services/main'

import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import UnauthorizedException from '#exceptions/unauthorized_exception'

interface UserChannelParams extends Record<string, string> {
  tenantId: string
  userId: string
}

interface TenantChannelParams extends Record<string, string> {
  tenantId: string
}

const ownsUserChannel = (ctx: HttpContext, params: UserChannelParams) => {
  const tenantId = Number(params.tenantId)
  const userId = Number(params.userId)
  return (
    Number.isInteger(tenantId) &&
    Number.isInteger(userId) &&
    ctx.tenant?.id === tenantId &&
    ctx.auth.user?.id === userId
  )
}

const authenticateTransmit = async (ctx: HttpContext, next: NextFn) => {
  try {
    await ctx.auth.authenticateUsing(['jwt'])
  } catch {
    throw new UnauthorizedException('Unauthorized realtime connection')
  }
  return next()
}

transmit.authorize<UserChannelParams>(
  'tenants/:tenantId/users/:userId/notifications',
  ownsUserChannel
)
transmit.authorize<UserChannelParams>('tenants/:tenantId/users/:userId/messages', ownsUserChannel)
transmit.authorize<TenantChannelParams>(
  'tenants/:tenantId/activity',
  (ctx, { tenantId }) => ctx.tenant?.id === Number(tenantId)
)

transmit.registerRoutes((route) => {
  route.use([authenticateTransmit, middleware.tenant({ required: true }), apiThrottle])
})
