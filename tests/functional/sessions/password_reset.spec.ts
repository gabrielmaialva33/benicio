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
 * Cria o usuário e devolve o token cru emitido pelo serviço. O token só existe
 * em memória (o banco guarda o digest), então precisa ser capturado aqui.
 */
async function emitirTokenDeRecuperacao(email: string) {
  const usuario = await User.create({
    full_name: 'Recuperação Teste',
    email,
    username: email.split('@')[0],
    password: 'senha-antiga-123',
  })

  const requestPasswordResetService = await app.container.make(RequestPasswordResetService)

  // O token cru só existe no corpo do e-mail; capturamos pelo fake do mailer.
  const { mails } = mail.fake()
  await requestPasswordResetService.run(email)
  const emailEnviado = mails.sent()[0] as unknown as
    { message?: { toJSON?: () => unknown } } | undefined
  mail.restore()

  const corpoSerializado = JSON.stringify(emailEnviado?.message?.toJSON?.() ?? emailEnviado ?? {})
  const tokenNoCorpo = corpoSerializado.match(/token=([^"'&\s\\]+)/)?.[1]

  return { usuario, tokenCru: tokenNoCorpo ? decodeURIComponent(tokenNoCorpo) : null }
}

test.group('Password reset', (group) => {
  group.each.setup(() => {
    limiter.clear()
    return () => limiter.clear()
  })

  test('emite um token de uso único e troca a senha', async ({ assert, cleanup }) => {
    cleanup(() => mail.restore())

    const email = 'reset.valido@example.com'
    const { usuario, tokenCru } = await emitirTokenDeRecuperacao(email)

    assert.isNotNull(tokenCru, 'o e-mail deve conter o token de recuperação')

    const resetPasswordService = await app.container.make(ResetPasswordService)
    await resetPasswordService.run(tokenCru!, 'nova-senha-456')

    // A nova senha vale e a antiga não.
    await assert.doesNotReject(() => User.verifyCredentials(email, 'nova-senha-456'))
    await assert.rejects(() => User.verifyCredentials(email, 'senha-antiga-123'))

    // O mesmo link não pode ser usado duas vezes.
    await assert.rejects(() => resetPasswordService.run(tokenCru!, 'outra-senha-789'))

    const tokens = await PasswordResetToken.query().where('user_id', usuario.id)
    assert.lengthOf(tokens, 1)
    assert.isNotNull(tokens[0].used_at)
  })

  test('recusa token expirado', async ({ assert, cleanup }) => {
    cleanup(() => mail.restore())

    const email = 'reset.expirado@example.com'
    const { usuario, tokenCru } = await emitirTokenDeRecuperacao(email)

    await PasswordResetToken.query()
      .where('user_id', usuario.id)
      .update({ expires_at: DateTime.now().minus({ minutes: 1 }).toSQL()! })

    const resetPasswordService = await app.container.make(ResetPasswordService)

    assert.isFalse(await resetPasswordService.isTokenValid(tokenCru!))
    await assert.rejects(() => resetPasswordService.run(tokenCru!, 'nova-senha-456'))
    await assert.doesNotReject(() => User.verifyCredentials(email, 'senha-antiga-123'))
  })

  test('responde igual para e-mail inexistente, sem criar token', async ({ assert, cleanup }) => {
    cleanup(() => mail.restore())
    mail.fake()

    const tokensAntes = await PasswordResetToken.query().count('* as total')

    const requestPasswordResetService = await app.container.make(RequestPasswordResetService)
    await assert.doesNotReject(() => requestPasswordResetService.run('ninguem@example.com'))

    const tokensDepois = await PasswordResetToken.query().count('* as total')
    assert.deepEqual(tokensDepois[0].$extras.total, tokensAntes[0].$extras.total)
  })

  test('a tela pública de recuperação responde sem autenticação', async ({ client }) => {
    const response = await client.get('/forgot-password')
    response.assertStatus(200)
  })
})
