import { inject } from '@adonisjs/core'

import BadRequestException from '#exceptions/bad_request_exception'
import type PasswordResetToken from '#modules/auth/models/password_reset_token'
import PasswordResetTokenRepository from '#modules/auth/repositories/password_reset_token_repository'
import RefreshTokenRepository from '#modules/auth/repositories/refresh_token_repository'
import { hashPasswordResetToken } from '#modules/auth/services/request_password_reset_service'
import UsersRepository from '#modules/users/repositories/users_repository'

@inject()
export default class ResetPasswordService {
  constructor(
    private usersRepository: UsersRepository,
    private refreshTokenRepository: RefreshTokenRepository,
    private passwordResetTokenRepository: PasswordResetTokenRepository
  ) {}

  /**
   * Checks whether the token is still usable without consuming it, so the
   * new-password screen can choose between the form and the expired-link notice.
   */
  async isTokenValid(rawToken: string): Promise<boolean> {
    return (await this.#findUsableToken(rawToken)) !== null
  }

  /**
   * Swaps the password and burns the token. Existing sessions are revoked:
   * whoever asked for the reset likely lost control of the account.
   */
  async run(rawToken: string, newPassword: string): Promise<void> {
    const tokenRecord = await this.#findUsableToken(rawToken)

    if (!tokenRecord) {
      throw new BadRequestException('Este link de redefinição expirou ou já foi utilizado.')
    }

    const user = await this.usersRepository.findBy('id', tokenRecord.user_id)

    if (!user) {
      throw new BadRequestException('Este link de redefinição expirou ou já foi utilizado.')
    }

    user.password = newPassword
    await this.usersRepository.persist(user)

    await this.passwordResetTokenRepository.markUsed(tokenRecord.id)
    await this.refreshTokenRepository.revokeActiveForUser(user.id, undefined, 'password_reset')
  }

  async #findUsableToken(rawToken: string): Promise<PasswordResetToken | null> {
    if (!rawToken) return null

    return this.passwordResetTokenRepository.findUsableByHash(hashPasswordResetToken(rawToken))
  }
}
