import { BaseMail } from '@adonisjs/mail'

import env from '#start/env'
import type User from '#modules/users/models/user'

export default class ResetPasswordNotification extends BaseMail {
  subject = 'Redefinição de senha'

  constructor(
    private user: User,
    private token: string,
    private validadeEmMinutos: number
  ) {
    super()
  }

  /**
   * The "prepare" method is called automatically when
   * the email is sent or queued.
   */
  prepare() {
    const resetUrl = `${env.get('APP_URL', 'http://localhost:3333')}/reset-password?token=${encodeURIComponent(this.token)}`
    const appName = env.get('MAIL_FROM_NAME', 'Benício')

    this.message.from(
      env.get('MAIL_FROM_ADDRESS', 'noreply@benicio.local'),
      env.get('MAIL_FROM_NAME', 'Benício')
    )
    this.message.to(this.user.email, this.user.full_name)

    // Igual ao fluxo de verificação de e-mail: em testes o Edge pode não estar
    // disponível, então o corpo vai inline.
    if (env.get('NODE_ENV') === 'test') {
      this.message.html(`
        <h1>Olá, ${this.user.full_name}!</h1>
        <p>Recebemos um pedido para redefinir a sua senha.</p>
        <p><a href="${resetUrl}">Criar uma nova senha</a></p>
        <p>O link expira em ${this.validadeEmMinutos} minutos.</p>
      `)
      this.message.text(`
        Olá, ${this.user.full_name}!

        Recebemos um pedido para redefinir a sua senha.
        Acesse o endereço abaixo para criar uma nova senha:
        ${resetUrl}

        O link expira em ${this.validadeEmMinutos} minutos.
      `)
      return
    }

    this.message.htmlView('emails/reset_password_html', {
      user: this.user,
      resetUrl,
      appName,
      expiresInMinutes: this.validadeEmMinutos,
    })
    this.message.textView('emails/reset_password_text', {
      user: this.user,
      resetUrl,
      appName,
      expiresInMinutes: this.validadeEmMinutos,
    })
  }
}
