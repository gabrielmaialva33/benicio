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
   * Verifica se o token ainda pode ser usado, sem consumi-lo. Serve para a tela
   * de nova senha decidir entre mostrar o formulário ou o aviso de link expirado.
   */
  async isTokenValid(tokenCru: string): Promise<boolean> {
    return (await this.#findUsableToken(tokenCru)) !== null
  }

  /**
   * Troca a senha e queima o token. As sessões antigas são revogadas: quem
   * pediu a troca provavelmente perdeu o controle da conta.
   */
  async run(tokenCru: string, novaSenha: string): Promise<void> {
    const registroDoToken = await this.#findUsableToken(tokenCru)

    if (!registroDoToken) {
      throw new BadRequestException('Este link de redefinição expirou ou já foi utilizado.')
    }

    const usuario = await this.usersRepository.findBy('id', registroDoToken.user_id)

    if (!usuario) {
      throw new BadRequestException('Este link de redefinição expirou ou já foi utilizado.')
    }

    usuario.password = novaSenha
    await this.usersRepository.persist(usuario)

    await this.passwordResetTokenRepository.markUsed(registroDoToken.id)
    await this.refreshTokenRepository.revokeActiveForUser(usuario.id, undefined, 'password_reset')
  }

  async #findUsableToken(tokenCru: string): Promise<PasswordResetToken | null> {
    if (!tokenCru) return null

    return this.passwordResetTokenRepository.findUsableByHash(hashPasswordResetToken(tokenCru))
  }
}
