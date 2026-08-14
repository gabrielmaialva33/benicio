import { createHash, randomBytes, randomUUID } from 'node:crypto'

import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'

import env from '#start/env'

import PasswordResetTokenRepository from '#modules/auth/repositories/password_reset_token_repository'
import ResetPasswordNotification from '#modules/auth/services/reset_password_notification'
import UsersRepository from '#modules/users/repositories/users_repository'

/** Janela de validade do link enviado por e-mail. */
const VALIDADE_EM_MINUTOS = 60

@inject()
export default class RequestPasswordResetService {
  constructor(
    private usersRepository: UsersRepository,
    private passwordResetTokenRepository: PasswordResetTokenRepository
  ) {}

  /**
   * Emite um token de recuperação e dispara o e-mail com o link.
   *
   * Não sinaliza se o e-mail existe: a resposta ao usuário é sempre a mesma,
   * para não transformar o formulário num verificador de cadastro.
   */
  async run(email: string, ctx?: HttpContext): Promise<void> {
    const emailNormalizado = email.trim().toLowerCase()
    const usuario = await this.usersRepository.findBy('email', emailNormalizado)

    if (!usuario) {
      logger.info({ email: emailNormalizado }, 'Password reset requested for unknown email')
      return
    }

    // Invalida os pedidos anteriores ainda abertos: só o link mais recente vale.
    await this.passwordResetTokenRepository.invalidateOpenTokensForUser(usuario.id)

    const tokenCru = `prt_${randomUUID()}.${randomBytes(48).toString('base64url')}`

    await this.passwordResetTokenRepository.create({
      id: randomUUID(),
      user_id: usuario.id,
      token_hash: hashPasswordResetToken(tokenCru),
      expires_at: DateTime.now().plus({ minutes: VALIDADE_EM_MINUTOS }),
      used_at: null,
      requested_ip: ctx?.request.ip() ?? null,
      user_agent: ctx?.request.header('user-agent')?.slice(0, 512) ?? null,
    })

    try {
      await mail.send(new ResetPasswordNotification(usuario, tokenCru, VALIDADE_EM_MINUTOS))
    } catch (falhaDeEnvio) {
      // Uma queda do SMTP não pode virar 500 na tela: além de quebrar a UX, o
      // erro só aparece quando o e-mail existe, entregando quem é cadastrado.
      logger.error({ err: falhaDeEnvio, userId: usuario.id }, 'Failed to send password reset email')

      if (!app.inProduction) {
        logger.warn(
          `[dev] Link de redefinição: ${env.get('APP_URL', 'http://localhost:3333')}/reset-password?token=${encodeURIComponent(tokenCru)}`
        )
      }
    }
  }
}

/** Digest persistido no banco — o token cru só viaja no link do e-mail. */
export function hashPasswordResetToken(tokenCru: string): string {
  return createHash('sha256').update(tokenCru).digest('hex')
}
