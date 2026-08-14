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

/** Validity window of the emailed link. */
const EXPIRATION_IN_MINUTES = 60

@inject()
export default class RequestPasswordResetService {
  constructor(
    private usersRepository: UsersRepository,
    private passwordResetTokenRepository: PasswordResetTokenRepository
  ) {}

  /**
   * Issues a recovery token and dispatches the email carrying the link.
   *
   * It never signals whether the email exists: the user-facing response is
   * always the same, so the form cannot double as an account checker.
   */
  async run(email: string, ctx?: HttpContext): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase()
    const user = await this.usersRepository.findBy('email', normalizedEmail)

    if (!user) {
      logger.info({ email: normalizedEmail }, 'Password reset requested for unknown email')
      return
    }

    // Close previous open requests: only the newest link stays valid.
    await this.passwordResetTokenRepository.invalidateOpenTokensForUser(user.id)

    const rawToken = `prt_${randomUUID()}.${randomBytes(48).toString('base64url')}`

    await this.passwordResetTokenRepository.create({
      id: randomUUID(),
      user_id: user.id,
      token_hash: hashPasswordResetToken(rawToken),
      expires_at: DateTime.now().plus({ minutes: EXPIRATION_IN_MINUTES }),
      used_at: null,
      requested_ip: ctx?.request.ip() ?? null,
      user_agent: ctx?.request.header('user-agent')?.slice(0, 512) ?? null,
    })

    try {
      await mail.send(new ResetPasswordNotification(user, rawToken, EXPIRATION_IN_MINUTES))
    } catch (deliveryFailure) {
      // An SMTP outage must not surface as a 500: besides breaking the UX, the
      // error only shows up when the email exists, leaking who is registered.
      logger.error({ err: deliveryFailure, userId: user.id }, 'Failed to send password reset email')

      if (!app.inProduction) {
        logger.warn(
          `[dev] Link de redefinição: ${env.get('APP_URL', 'http://localhost:3333')}/reset-password?token=${encodeURIComponent(rawToken)}`
        )
      }
    }
  }
}

/** Digest stored in the database — the raw token only travels in the email link. */
export function hashPasswordResetToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}
