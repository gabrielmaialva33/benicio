import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import limiter from '@adonisjs/limiter/services/main'
import jwt from 'jsonwebtoken'
import type { ApiClient } from '@japa/api-client'

import env from '#start/env'
import { createLegalAdmin } from '#tests/helpers/legal_context'

test.group('Sessions lifecycle', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(async () => {
    await limiter.clear()
    return () => limiter.clear()
  })

  async function signIn(client: ApiClient) {
    const { user, tenants } = await createLegalAdmin()
    const response = await client.post('/api/v1/sessions/sign-in').json({
      uid: user.email,
      password: 'password123',
    })
    response.assertStatus(200)
    return { user, tenant: tenants[0], auth: response.body().auth }
  }

  test('rotates refresh tokens and revokes the family when an old token is replayed', async ({
    client,
    assert,
  }) => {
    const { user, tenant, auth } = await signIn(client)
    const accessPayload = jwt.verify(auth.access_token, env.get('APP_KEY')) as {
      typ: string
      sid: string
      tenantId: number
    }
    assert.equal(accessPayload.typ, 'access')
    assert.equal(accessPayload.tenantId, tenant.id)
    assert.isString(accessPayload.sid)

    const rotated = await client
      .post('/api/v1/sessions/refresh')
      .header('Authorization', `Bearer ${auth.refresh_token}`)
    rotated.assertStatus(200)
    assert.notEqual(rotated.body().access_token, auth.access_token)
    assert.notEqual(rotated.body().refresh_token, auth.refresh_token)

    const me = await client
      .get('/api/v1/me')
      .header('Authorization', `Bearer ${rotated.body().access_token}`)
    me.assertStatus(200)
    me.assertBodyContains({ id: user.id })

    const replay = await client
      .post('/api/v1/sessions/refresh')
      .header('Accept', 'application/json')
      .header('Authorization', `Bearer ${auth.refresh_token}`)
    replay.assertStatus(401)

    const revokedAccess = await client
      .get('/api/v1/me')
      .header('Accept', 'application/json')
      .header('Authorization', `Bearer ${rotated.body().access_token}`)
    revokedAccess.assertStatus(401)
  })

  test('revokes both access and refresh tokens on logout', async ({ client }) => {
    const { auth } = await signIn(client)

    const logout = await client
      .post('/api/v1/sessions/logout')
      .header('Authorization', `Bearer ${auth.access_token}`)
    logout.assertStatus(204)

    const accessAfterLogout = await client
      .get('/api/v1/me')
      .header('Accept', 'application/json')
      .header('Authorization', `Bearer ${auth.access_token}`)
    accessAfterLogout.assertStatus(401)

    const refreshAfterLogout = await client
      .post('/api/v1/sessions/refresh')
      .header('Accept', 'application/json')
      .json({ refresh_token: auth.refresh_token })
    refreshAfterLogout.assertStatus(401)
  })

  test('rejects malformed refresh tokens without leaking token state', async ({ client }) => {
    const response = await client
      .post('/api/v1/sessions/refresh')
      .header('Accept', 'application/json')
      .json({ refresh_token: 'not-a-refresh-token' })

    response.assertStatus(401)
  })
})
