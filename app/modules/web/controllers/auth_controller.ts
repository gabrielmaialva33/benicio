import { inject } from '@adonisjs/core'
import { type HttpContext } from '@adonisjs/core/http'
import { createUserValidator, signInValidator } from '#modules/users/validators/users_validator'
import SignInService from '#modules/auth/services/sign_in_service'
import SignUpService from '#modules/auth/services/sign_up_service'
import LogoutSessionService from '#modules/auth/services/logout_session_service'
import { inertiaRedirectBack, inertiaRedirectTo } from '#shared/http/inertia_redirect'
import { resolveHomeRoute } from '#shared/http/resolve_home_route'

@inject()
export default class InertiaAuthController {
  constructor(
    private signInService: SignInService,
    private signUpService: SignUpService,
    private logoutSessionService: LogoutSessionService
  ) {}

  async showLogin({ inertia }: HttpContext) {
    return inertia.render('auth/login', {})
  }

  async showRegister({ inertia }: HttpContext) {
    return inertia.render('auth/register', {})
  }

  async login(ctx: HttpContext) {
    const { request, session } = ctx
    const { uid, password } = await request.validateUsing(signInValidator)

    try {
      const usuarioAutenticado = await this.signInService.run({
        uid,
        password,
        ctx,
        accessTokenLifetime: '1h',
      })

      return inertiaRedirectTo(ctx, await resolveHomeRoute(usuarioAutenticado.id))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid credentials'
      session.flash('errors', { general: message })
      return inertiaRedirectBack(ctx)
    }
  }

  async register(ctx: HttpContext) {
    const { request, session } = ctx

    try {
      const data = await request.validateUsing(createUserValidator)

      await this.signUpService.run(data, { ctx, accessTokenLifetime: '1h' })

      // SignUpService already handles JWT generation and login

      return inertiaRedirectTo(ctx, '/dashboard')
    } catch (error) {
      // Handle validation errors
      if (error && typeof error === 'object' && 'messages' in error) {
        session.flash('errors', error.messages as Record<string, unknown>)
      } else {
        const message = error instanceof Error ? error.message : 'Registration failed'
        session.flash('errors', { general: message })
      }
      return inertiaRedirectBack(ctx)
    }
  }

  async logout(ctx: HttpContext) {
    await this.logoutSessionService.run(ctx, ctx.auth.getUserOrFail().id)
    return inertiaRedirectTo(ctx, '/login')
  }
}
