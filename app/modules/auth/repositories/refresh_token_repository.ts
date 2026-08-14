import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

import RefreshToken from '#modules/auth/models/refresh_token'

export type CreateRefreshTokenData = {
  id: string
  family_id: string
  user_id: number
  tenant_id: number | null
  token_hash: string
  replaced_by_id: string | null
  expires_at: DateTime
  used_at: DateTime | null
  revoked_at: DateTime | null
  revoked_reason: string | null
  created_ip: string | null
  user_agent: string | null
}

export default class RefreshTokenRepository {
  findByHashForUpdate(
    tokenHash: string,
    client: TransactionClientContract
  ): Promise<RefreshToken | null> {
    return this.query(client).where('token_hash', tokenHash).forUpdate().first()
  }

  create(data: CreateRefreshTokenData, client?: TransactionClientContract): Promise<RefreshToken> {
    return client ? RefreshToken.create(data, { client }) : RefreshToken.create(data)
  }

  async markReplaced(
    tokenId: string,
    replacedById: string,
    client?: TransactionClientContract
  ): Promise<void> {
    await this.query(client).where('id', tokenId).update({ replaced_by_id: replacedById })
  }

  async markRotated(
    tokenId: string,
    replacedById: string,
    at: DateTime,
    client: TransactionClientContract
  ): Promise<void> {
    await this.query(client).where('id', tokenId).update({
      used_at: at,
      revoked_at: at,
      revoked_reason: 'rotated',
      replaced_by_id: replacedById,
    })
  }

  async revokeToken(
    tokenId: string,
    reason: string,
    client: TransactionClientContract
  ): Promise<void> {
    await this.query(client).where('id', tokenId).update({
      revoked_at: DateTime.now(),
      revoked_reason: reason,
    })
  }

  async revokeFamily(
    userId: number,
    familyId: string,
    reason: string,
    client: TransactionClientContract
  ): Promise<void> {
    await this.query(client)
      .where('family_id', familyId)
      .where('user_id', userId)
      .whereNull('revoked_at')
      .update({ revoked_at: DateTime.now(), revoked_reason: reason })
  }

  async revokeActiveForUser(
    userId: number,
    familyId?: string,
    revokedReason: string = 'logout'
  ): Promise<void> {
    const query = this.query().where('user_id', userId).whereNull('revoked_at')
    if (familyId) query.where('family_id', familyId)
    await query.update({ revoked_at: DateTime.now(), revoked_reason: revokedReason })
  }

  async isFamilyActive(familyId: string, userId: string | number | bigint): Promise<boolean> {
    const token = await this.query()
      .where('family_id', familyId)
      .where('user_id', Number(userId))
      .whereNull('revoked_at')
      .where('expires_at', '>', DateTime.now().toSQL()!)
      .first()
    return token !== null
  }

  private query(
    client?: TransactionClientContract
  ): ModelQueryBuilderContract<typeof RefreshToken> {
    return client ? RefreshToken.query({ client }) : RefreshToken.query()
  }
}
