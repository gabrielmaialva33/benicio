import { randomBytes, randomUUID } from 'node:crypto'

import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import UnauthorizedException from '#exceptions/unauthorized_exception'
import JwtAuthTokensService, {
  type GenerateAuthTokensResponse,
} from '#modules/auth/services/jwt_auth_tokens_service'

type RefreshTokenRow = {
  id: string
  family_id: string
  user_id: number
  tenant_id: number | null
  expires_at: Date | string
  used_at: Date | string | null
  revoked_at: Date | string | null
}

type RotationResult =
  { kind: 'ok'; tokens: GenerateAuthTokensResponse } | { kind: 'invalid' | 'replayed' }

@inject()
export default class RefreshSessionService {
  constructor(private jwtAuthTokensService: JwtAuthTokensService) {}

  async rotate(rawToken: string, ctx: HttpContext): Promise<GenerateAuthTokensResponse> {
    const tokenHash = this.jwtAuthTokensService.hashRefreshToken(rawToken)

    const result = await db.transaction<RotationResult>(async (trx) => {
      const current = (await trx
        .from('refresh_tokens')
        .where('token_hash', tokenHash)
        .forUpdate()
        .first()) as RefreshTokenRow | undefined

      if (!current) {
        return { kind: 'invalid' }
      }

      if (current.used_at || current.revoked_at) {
        await trx
          .from('refresh_tokens')
          .where('family_id', current.family_id)
          .where('user_id', current.user_id)
          .whereNull('revoked_at')
          .update({
            revoked_at: new Date(),
            revoked_reason: 'replay_detected',
          })
        return { kind: 'replayed' }
      }

      if (this.toDateTime(current.expires_at) <= DateTime.now()) {
        await trx.from('refresh_tokens').where('id', current.id).update({
          revoked_at: new Date(),
          revoked_reason: 'expired',
        })
        return { kind: 'invalid' }
      }

      const user = await trx
        .from('users')
        .where('id', current.user_id)
        .where('is_deleted', false)
        .first()
      if (!user) {
        await this.revokeFamily(trx, current, 'user_unavailable')
        return { kind: 'invalid' }
      }

      if (current.tenant_id !== null) {
        const membership = await trx
          .from('user_tenants')
          .innerJoin('tenants', 'tenants.id', 'user_tenants.tenant_id')
          .where('user_tenants.user_id', current.user_id)
          .where('user_tenants.tenant_id', current.tenant_id)
          .where('tenants.is_active', true)
          .first()
        if (!membership) {
          await this.revokeFamily(trx, current, 'tenant_unavailable')
          return { kind: 'invalid' }
        }
      }

      const nextId = randomUUID()
      const nextRaw = `rt_${randomUUID()}.${randomBytes(48).toString('base64url')}`
      const now = new Date()

      await trx.table('refresh_tokens').insert({
        id: nextId,
        family_id: current.family_id,
        user_id: current.user_id,
        tenant_id: current.tenant_id,
        token_hash: this.jwtAuthTokensService.hashRefreshToken(nextRaw),
        replaced_by_id: null,
        expires_at: DateTime.now().plus({ days: 3 }).toJSDate(),
        used_at: null,
        revoked_at: null,
        revoked_reason: null,
        created_ip: ctx.request.ip(),
        user_agent: ctx.request.header('user-agent')?.slice(0, 512) ?? null,
        created_at: now,
      })

      await trx.from('refresh_tokens').where('id', current.id).update({
        used_at: now,
        revoked_at: now,
        revoked_reason: 'rotated',
        replaced_by_id: nextId,
      })

      const accessToken = await this.jwtAuthTokensService.generateAccessToken(
        {
          userId: current.user_id,
          ...(current.tenant_id !== null ? { tenantId: current.tenant_id } : {}),
        },
        current.family_id
      )

      return {
        kind: 'ok',
        tokens: { access_token: accessToken, refresh_token: nextRaw },
      }
    })

    if (result.kind !== 'ok') {
      throw new UnauthorizedException(
        result.kind === 'replayed'
          ? 'Refresh token reuse detected; session revoked'
          : 'Invalid or expired refresh token'
      )
    }

    return result.tokens
  }

  async logout(userId: number, familyId?: string): Promise<void> {
    const query = db.from('refresh_tokens').where('user_id', userId).whereNull('revoked_at')

    if (familyId) {
      query.where('family_id', familyId)
    }

    await query.update({ revoked_at: new Date(), revoked_reason: 'logout' })
  }

  private async revokeFamily(
    trx: TransactionClientContract,
    token: RefreshTokenRow,
    reason: string
  ): Promise<void> {
    await trx
      .from('refresh_tokens')
      .where('family_id', token.family_id)
      .where('user_id', token.user_id)
      .whereNull('revoked_at')
      .update({ revoked_at: new Date(), revoked_reason: reason })
  }

  private toDateTime(value: Date | string): DateTime {
    return value instanceof Date ? DateTime.fromJSDate(value) : DateTime.fromISO(value)
  }
}
