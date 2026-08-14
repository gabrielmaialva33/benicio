import { createHash, randomBytes, randomUUID } from 'node:crypto'

import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { BaseJwtContent } from '#shared/jwt/types'
import JwtService from '#shared/jwt/jwt_service'
import type RefreshToken from '#modules/auth/models/refresh_token'
import RefreshTokenRepository from '#modules/auth/repositories/refresh_token_repository'

import env from '#start/env'

export interface JwtContent extends BaseJwtContent {}

export type GenerateAuthTokensResponse = {
  access_token: string
  refresh_token: string
}

export type AccessTokenLifetime = '15m' | '1h'

@inject()
export default class JwtAuthTokensService {
  constructor(
    private jwtService: JwtService,
    private refreshTokenRepository: RefreshTokenRepository
  ) {}

  async run(
    payload: JwtContent,
    ctx?: HttpContext,
    options: { accessTokenLifetime?: AccessTokenLifetime } = {}
  ): Promise<GenerateAuthTokensResponse> {
    const lifetime = options.accessTokenLifetime ?? '15m'
    const familyId = randomUUID()
    const { raw: refreshToken } = await this.createRefreshToken(payload, familyId, ctx)
    const accessToken = await this.generateAccessToken(payload, familyId, lifetime)
    if (ctx) this.setAccessCookie(ctx, accessToken, lifetime)

    return { access_token: accessToken, refresh_token: refreshToken }
  }

  setAccessCookie(
    ctx: HttpContext,
    accessToken: string,
    lifetime: AccessTokenLifetime = '15m'
  ): void {
    ctx.response.cookie('token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.get('NODE_ENV') === 'production',
      path: '/',
      expires: DateTime.now()
        .plus(lifetime === '1h' ? { hours: 1 } : { minutes: 15 })
        .toJSDate(),
    })
  }

  async setTenantAccessCookie(ctx: HttpContext, userId: number, tenantId: number): Promise<void> {
    const currentToken: unknown = ctx.request.cookie('token')
    const currentPayload =
      typeof currentToken === 'string' ? this.jwtService.decode(currentToken) : null
    const familyId =
      currentPayload && typeof currentPayload === 'object' && typeof currentPayload.sid === 'string'
        ? currentPayload.sid
        : undefined
    const accessToken = familyId
      ? await this.generateAccessToken({ userId, tenantId }, familyId, '1h')
      : await this.jwtService.sign(
          { userId, tenantId, typ: 'access', jti: randomUUID() },
          env.get('APP_KEY'),
          '1h'
        )

    this.setAccessCookie(ctx, accessToken, '1h')
  }

  generateAccessToken(
    payload: JwtContent,
    familyId: string,
    lifetime: AccessTokenLifetime = '15m'
  ): Promise<string> {
    return this.jwtService.sign(
      { ...payload, typ: 'access', jti: randomUUID(), sid: familyId },
      env.get('APP_KEY'),
      lifetime
    )
  }

  async createRefreshToken(
    payload: JwtContent,
    familyId: string,
    ctx?: HttpContext,
    replacedTokenId?: string,
    client?: TransactionClientContract
  ): Promise<{ raw: string; record: RefreshToken }> {
    const raw = `rt_${randomUUID()}.${randomBytes(48).toString('base64url')}`
    const record = await this.refreshTokenRepository.create(
      {
        id: randomUUID(),
        family_id: familyId,
        user_id: Number(payload.userId),
        tenant_id: payload.tenantId ?? null,
        token_hash: this.hashRefreshToken(raw),
        replaced_by_id: null,
        expires_at: DateTime.now().plus({ days: 3 }),
        used_at: null,
        revoked_at: null,
        revoked_reason: null,
        created_ip: ctx?.request.ip() ?? null,
        user_agent: ctx?.request.header('user-agent')?.slice(0, 512) ?? null,
      },
      client
    )

    if (replacedTokenId) {
      await this.refreshTokenRepository.markReplaced(replacedTokenId, record.id, client)
    }

    return { raw, record }
  }

  hashRefreshToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex')
  }
}
