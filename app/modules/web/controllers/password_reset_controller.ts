import { inject } from '@adonisjs/core'
import { type HttpContext } from '@adonisjs/core/http'

import {
  requestPasswordResetValidator,
  resetPasswordValidator,
} from '#modules/auth/validators/password_reset_validator'
import RequestPasswordResetService from '#modules/auth/services/request_password_reset_service'
import ResetPasswordService from '#modules/auth/services/reset_password_service'
import { inertiaRedirectBack, inertiaRedirectTo } from '#shared/http/inertia_redirect'

/**
 * Resposta única do "esqueci minha senha". Confirmar ou negar a existência do
 * e-mail transformaria a tela num verificador de cadastro.
 */
const AVISO_DE_ENVIO =
  'Se este e-mail estiver cadastrado, enviamos um link para redefinir a senha. Verifique também a caixa de spam.'

@inject()
export default class InertiaPasswordResetController {
  constructor(
    private requestPasswordResetService: RequestPasswordResetService,
    private resetPasswordService: ResetPasswordService
  ) {}

  async showForgot({ inertia }: HttpContext) {
    return inertia.render('auth/forgot_password', {})
  }

  async sendResetLink(ctx: HttpContext) {
    const { request, session } = ctx
    const { email } = await request.validateUsing(requestPasswordResetValidator)

    await this.requestPasswordResetService.run(email, ctx)

    session.flash('success', AVISO_DE_ENVIO)
    return inertiaRedirectBack(ctx)
  }

  async showReset({ inertia, request }: HttpContext) {
    const token = request.input('token', '')
    const tokenIsValid = await this.resetPasswordService.isTokenValid(token)

    return inertia.render('auth/reset_password', { token, tokenIsValid })
  }

  async resetPassword(ctx: HttpContext) {
    const { request, session } = ctx
    const { token, password } = await request.validateUsing(resetPasswordValidator)

    try {
      await this.resetPasswordService.run(token, password)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível redefinir a senha.'
      session.flash('errors', { general: message })
      return inertiaRedirectBack(ctx)
    }

    session.flash('success', 'Senha redefinida com sucesso. Entre com a nova senha.')
    return inertiaRedirectTo(ctx, '/login')
  }
}
