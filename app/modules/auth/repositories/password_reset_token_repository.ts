import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

import PasswordResetToken from '#modules/auth/models/password_reset_token'

export type CreatePasswordResetTokenData = {
  id: string
  user_id: number
  token_hash: string
  expires_at: DateTime
  used_at: DateTime | null
  requested_ip: string | null
  user_agent: string | null
}

export default class PasswordResetTokenRepository {
  create(
    data: CreatePasswordResetTokenData,
    client?: TransactionClientContract
  ): Promise<PasswordResetToken> {
    return client ? PasswordResetToken.create(data, { client }) : PasswordResetToken.create(data)
  }

  /** Still-open token: unconsumed and inside the validity window. */
  findUsableByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.query()
      .where('token_hash', tokenHash)
      .whereNull('used_at')
      .where('expires_at', '>', DateTime.now().toSQL()!)
      .first()
  }

  /** Closes the user's previous requests — only the newest link stays valid. */
  async invalidateOpenTokensForUser(userId: number): Promise<void> {
    await this.query()
      .where('user_id', userId)
      .whereNull('used_at')
      .update({ used_at: DateTime.now().toSQL()! })
  }

  async markUsed(tokenId: string): Promise<void> {
    await this.query().where('id', tokenId).update({ used_at: DateTime.now().toSQL()! })
  }

  private query(
    client?: TransactionClientContract
  ): ModelQueryBuilderContract<typeof PasswordResetToken> {
    return client ? PasswordResetToken.query({ client }) : PasswordResetToken.query()
  }
}
