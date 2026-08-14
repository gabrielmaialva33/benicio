import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import jwt from 'jsonwebtoken'

import RefreshSessionService from '#modules/auth/services/refresh_session_service'

@inject()
export default class LogoutSessionService {
  constructor(private refreshSessionService: RefreshSessionService) {}

  async run(ctx: HttpContext, userId: number): Promise<void> {
    const token = this.readBearerToken(ctx) ?? this.readAccessCookie(ctx)
    const payload = token ? jwt.decode(token) : null
    const familyId =
      payload && typeof payload === 'object' && typeof payload.sid === 'string'
        ? payload.sid
        : undefined

    await this.refreshSessionService.logout(userId, familyId)
    ctx.response.clearCookie('token')
  }

  private readBearerToken(ctx: HttpContext): string | undefined {
    const authorization = ctx.request.header('authorization')
    const [scheme, token] = authorization?.trim().split(/\s+/, 2) ?? []
    return scheme?.toLowerCase() === 'bearer' && token ? token : undefined
  }

  private readAccessCookie(ctx: HttpContext): string | undefined {
    const token: unknown = ctx.request.cookie('token')
    return typeof token === 'string' ? token : undefined
  }
}
