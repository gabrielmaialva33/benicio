import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

import UnauthorizedException from '#exceptions/unauthorized_exception'
import RefreshTokenRepository from '#modules/auth/repositories/refresh_token_repository'
import JwtAuthTokensService, {
  type GenerateAuthTokensResponse,
} from '#modules/auth/services/jwt_auth_tokens_service'
import TenantRepository from '#modules/tenants/repositories/tenant_repository'
import UsersRepository from '#modules/users/repositories/users_repository'
import UnitOfWork from '#shared/lucid/unit_of_work'

type RotationResult =
  { kind: 'ok'; tokens: GenerateAuthTokensResponse } | { kind: 'invalid' | 'replayed' }

@inject()
export default class RefreshSessionService {
  constructor(
    private jwtAuthTokensService: JwtAuthTokensService,
    private refreshTokenRepository: RefreshTokenRepository,
    private usersRepository: UsersRepository,
    private tenantRepository: TenantRepository,
    private unitOfWork: UnitOfWork
  ) {}

  async rotate(rawToken: string, ctx: HttpContext): Promise<GenerateAuthTokensResponse> {
    const tokenHash = this.jwtAuthTokensService.hashRefreshToken(rawToken)

    const result = await this.unitOfWork.run<RotationResult>(async (trx) => {
      const current = await this.refreshTokenRepository.findByHashForUpdate(tokenHash, trx)

      if (!current) {
        return { kind: 'invalid' }
      }

      if (current.used_at || current.revoked_at) {
        await this.refreshTokenRepository.revokeFamily(
          current.user_id,
          current.family_id,
          'replay_detected',
          trx
        )
        return { kind: 'replayed' }
      }

      if (current.expires_at <= DateTime.now()) {
        await this.refreshTokenRepository.revokeToken(current.id, 'expired', trx)
        return { kind: 'invalid' }
      }

      const user = await this.usersRepository.findBy('id', current.user_id, { client: trx })
      if (!user) {
        await this.refreshTokenRepository.revokeFamily(
          current.user_id,
          current.family_id,
          'user_unavailable',
          trx
        )
        return { kind: 'invalid' }
      }

      if (current.tenant_id !== null) {
        const membership = await this.tenantRepository.findForUser(
          current.user_id,
          current.tenant_id,
          { activeOnly: true, client: trx }
        )
        if (!membership) {
          await this.refreshTokenRepository.revokeFamily(
            current.user_id,
            current.family_id,
            'tenant_unavailable',
            trx
          )
          return { kind: 'invalid' }
        }
      }

      const next = await this.jwtAuthTokensService.createRefreshToken(
        {
          userId: current.user_id,
          ...(current.tenant_id !== null ? { tenantId: current.tenant_id } : {}),
        },
        current.family_id,
        ctx,
        undefined,
        trx
      )
      await this.refreshTokenRepository.markRotated(current.id, next.record.id, DateTime.now(), trx)

      const accessToken = await this.jwtAuthTokensService.generateAccessToken(
        {
          userId: current.user_id,
          ...(current.tenant_id !== null ? { tenantId: current.tenant_id } : {}),
        },
        current.family_id
      )

      return {
        kind: 'ok',
        tokens: { access_token: accessToken, refresh_token: next.raw },
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
    await this.refreshTokenRepository.revokeActiveForUser(userId, familyId)
  }
}
