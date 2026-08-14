import { type HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { createUserValidator, signInValidator } from '#modules/users/validators/users_validator'
import SignInService from '#modules/auth/services/sign_in_service'
import SignUpService from '#modules/auth/services/sign_up_service'
import RefreshSessionService from '#modules/auth/services/refresh_session_service'
import JwtAuthTokensService from '#modules/auth/services/jwt_auth_tokens_service'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import jwt from 'jsonwebtoken'

export default class SessionsController {
  async signIn(ctx: HttpContext) {
    const { request, response } = ctx
    const { uid, password } = await request.validateUsing(signInValidator)

    try {
      const service = await app.container.make(SignInService)
      const payload = await service.run({ uid, password, ctx })
      return response.json(payload)
    } catch (error) {
      return response.badRequest({
        errors: [
          {
            message: error instanceof Error ? error.message : 'Invalid credentials',
          },
        ],
      })
    }
  }

  async signUp({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createUserValidator)

    const service = await app.container.make(SignUpService)
    const userWithAuth = await service.run(payload)

    return response.created(userWithAuth)
  }

  async refresh(ctx: HttpContext) {
    const refreshToken = this.readBearerToken(ctx) ?? ctx.request.input('refresh_token')
    if (typeof refreshToken !== 'string' || !refreshToken.startsWith('rt_')) {
      throw new UnauthorizedException('A valid refresh token is required')
    }

    const service = await app.container.make(RefreshSessionService)
    const tokens = await service.rotate(refreshToken, ctx)
    const tokenService = await app.container.make(JwtAuthTokensService)
    tokenService.setAccessCookie(ctx, tokens.access_token)
    return ctx.response.ok(tokens)
  }

  async logout(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()
    const accessToken = this.readBearerToken(ctx) ?? this.readAccessCookie(ctx)
    const payload = accessToken ? jwt.decode(accessToken) : null
    const familyId =
      payload && typeof payload === 'object' && typeof payload.sid === 'string'
        ? payload.sid
        : undefined

    const service = await app.container.make(RefreshSessionService)
    await service.logout(user.id, familyId)
    ctx.response.clearCookie('token')
    return ctx.response.noContent()
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
