import { inject } from '@adonisjs/core'
import { type HttpContext } from '@adonisjs/core/http'
import { createUserValidator, signInValidator } from '#modules/users/validators/users_validator'
import SignInService from '#modules/auth/services/sign_in_service'
import SignUpService from '#modules/auth/services/sign_up_service'
import RefreshSessionService from '#modules/auth/services/refresh_session_service'
import JwtAuthTokensService from '#modules/auth/services/jwt_auth_tokens_service'
import LogoutSessionService from '#modules/auth/services/logout_session_service'
import UnauthorizedException from '#exceptions/unauthorized_exception'

@inject()
export default class SessionsController {
  constructor(
    private signInService: SignInService,
    private signUpService: SignUpService,
    private refreshSessionService: RefreshSessionService,
    private jwtAuthTokensService: JwtAuthTokensService,
    private logoutSessionService: LogoutSessionService
  ) {}

  async signIn(ctx: HttpContext) {
    const { request, response } = ctx
    const { uid, password } = await request.validateUsing(signInValidator)

    try {
      const payload = await this.signInService.run({ uid, password, ctx })
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

  async signUp(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(createUserValidator)

    const userWithAuth = await this.signUpService.run(payload, { ctx })

    return ctx.response.created(userWithAuth)
  }

  async refresh(ctx: HttpContext) {
    const refreshToken = this.readBearerToken(ctx) ?? ctx.request.input('refresh_token')
    if (typeof refreshToken !== 'string' || !refreshToken.startsWith('rt_')) {
      throw new UnauthorizedException('A valid refresh token is required')
    }

    const tokens = await this.refreshSessionService.rotate(refreshToken, ctx)
    this.jwtAuthTokensService.setAccessCookie(ctx, tokens.access_token)
    return ctx.response.ok(tokens)
  }

  async logout(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()
    await this.logoutSessionService.run(ctx, user.id)
    return ctx.response.noContent()
  }

  private readBearerToken(ctx: HttpContext): string | undefined {
    const authorization = ctx.request.header('authorization')
    const [scheme, token] = authorization?.trim().split(/\s+/, 2) ?? []
    return scheme?.toLowerCase() === 'bearer' && token ? token : undefined
  }
}
