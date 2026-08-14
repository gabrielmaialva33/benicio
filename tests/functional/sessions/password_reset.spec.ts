import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import limiter from '@adonisjs/limiter/services/main'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'

import PasswordResetToken from '#modules/auth/models/password_reset_token'
import RequestPasswordResetService from '#modules/auth/services/request_password_reset_service'
import ResetPasswordService from '#modules/auth/services/reset_password_service'
import User from '#modules/users/models/user'

/**
 * Creates the user and returns the raw token issued by the service. The token
 * only lives in memory (the database keeps the digest), so it must be captured
 * right here.
 */
async function issueRecoveryToken(email: string) {
  const user = await User.create({
    full_name: 'Recovery Test',
    email,
    username: email.split('@')[0],
    password: 'old-password-123',
  })

  const requestPasswordResetService = await app.container.make(RequestPasswordResetService)

  // The raw token only exists in the email body; grab it from the mailer fake.
  const { mails } = mail.fake()
  await requestPasswordResetService.run(email)
  const sentEmail = mails.sent()[0] as unknown as
    { message?: { toJSON?: () => unknown } } | undefined
  mail.restore()

  const serializedBody = JSON.stringify(sentEmail?.message?.toJSON?.() ?? sentEmail ?? {})
  const tokenInBody = serializedBody.match(/token=([^"'&\s\\]+)/)?.[1]

  return { user, rawToken: tokenInBody ? decodeURIComponent(tokenInBody) : null }
}

test.group('Password reset', (group) => {
  group.each.setup(() => {
    limiter.clear()
    return () => limiter.clear()
  })

  test('issues a single-use token and swaps the password', async ({ assert, cleanup }) => {
    cleanup(() => mail.restore())

    const email = 'reset.valid@example.com'
    const { user, rawToken } = await issueRecoveryToken(email)

    assert.isNotNull(rawToken, 'the email must carry the recovery token')

    const resetPasswordService = await app.container.make(ResetPasswordService)
    await resetPasswordService.run(rawToken!, 'new-password-456')

    // The new password works and the old one does not.
    await assert.doesNotReject(() => User.verifyCredentials(email, 'new-password-456'))
    await assert.rejects(() => User.verifyCredentials(email, 'old-password-123'))

    // The same link cannot be used twice.
    await assert.rejects(() => resetPasswordService.run(rawToken!, 'other-password-789'))

    const tokens = await PasswordResetToken.query().where('user_id', user.id)
    assert.lengthOf(tokens, 1)
    assert.isNotNull(tokens[0].used_at)
  })

  test('rejects an expired token', async ({ assert, cleanup }) => {
    cleanup(() => mail.restore())

    const email = 'reset.expired@example.com'
    const { user, rawToken } = await issueRecoveryToken(email)

    await PasswordResetToken.query()
      .where('user_id', user.id)
      .update({ expires_at: DateTime.now().minus({ minutes: 1 }).toSQL()! })

    const resetPasswordService = await app.container.make(ResetPasswordService)

    assert.isFalse(await resetPasswordService.isTokenValid(rawToken!))
    await assert.rejects(() => resetPasswordService.run(rawToken!, 'new-password-456'))
    await assert.doesNotReject(() => User.verifyCredentials(email, 'old-password-123'))
  })

  test('answers the same for an unknown email, creating no token', async ({ assert, cleanup }) => {
    cleanup(() => mail.restore())
    mail.fake()

    const tokensBefore = await PasswordResetToken.query().count('* as total')

    const requestPasswordResetService = await app.container.make(RequestPasswordResetService)
    await assert.doesNotReject(() => requestPasswordResetService.run('nobody@example.com'))

    const tokensAfter = await PasswordResetToken.query().count('* as total')
    assert.deepEqual(tokensAfter[0].$extras.total, tokensBefore[0].$extras.total)
  })

  test('serves the public recovery screen without authentication', async ({ client }) => {
    const response = await client.get('/forgot-password')
    response.assertStatus(200)
  })
})
