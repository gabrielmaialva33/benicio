import { createHash, randomBytes, randomUUID } from 'node:crypto'

import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { BaseJwtContent } from '#shared/jwt/types'
import JwtService from '#shared/jwt/jwt_service'
import RefreshToken from '#modules/auth/models/refresh_token'

import env from '#start/env'

export interface JwtContent extends BaseJwtContent {}

export type GenerateAuthTokensResponse = {
  access_token: string
  refresh_token: string
}

@inject()
export default class JwtAuthTokensService {
  constructor(private jwtService: JwtService) {}

  async run(payload: JwtContent, ctx?: HttpContext): Promise<GenerateAuthTokensResponse> {
    const familyId = randomUUID()
    const { raw: refreshToken } = await this.createRefreshToken(payload, familyId, ctx)
    const accessToken = await this.generateAccessToken(payload, familyId)
    if (ctx) this.setAccessCookie(ctx, accessToken)

    return { access_token: accessToken, refresh_token: refreshToken }
  }

  setAccessCookie(ctx: HttpContext, accessToken: string): void {
    ctx.response.cookie('token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.get('NODE_ENV') === 'production',
      path: '/',
      expires: DateTime.now().plus({ minutes: 15 }).toJSDate(),
    })
  }

  generateAccessToken(payload: JwtContent, familyId: string): Promise<string> {
    return this.jwtService.sign(
      { ...payload, typ: 'access', jti: randomUUID(), sid: familyId },
      env.get('APP_KEY'),
      '15m'
    )
  }

  async createRefreshToken(
    payload: JwtContent,
    familyId: string,
    ctx?: HttpContext,
    replacedTokenId?: string
  ): Promise<{ raw: string; record: RefreshToken }> {
    const raw = `rt_${randomUUID()}.${randomBytes(48).toString('base64url')}`
    const record = await RefreshToken.create({
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
    })

    if (replacedTokenId) {
      await RefreshToken.query().where('id', replacedTokenId).update({ replaced_by_id: record.id })
    }

    return { raw, record }
  }

  hashRefreshToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex')
  }
}
