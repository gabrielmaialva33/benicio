import { defineConfig, transports } from '@adonisjs/mail'
import env from '#start/env'

const defaultMailer = env.get('MAIL_MAILER', 'resend')
const resendKey = env.get('RESEND_API_KEY', '')
if (env.get('NODE_ENV') === 'production' && defaultMailer === 'resend' && !resendKey.trim()) {
  throw new Error('RESEND_API_KEY is required for MAIL_MAILER=resend')
}

const mailConfig = defineConfig({
  default: defaultMailer as 'smtp' | 'mailgun' | 'resend',

  /**
   * A static address for the "from" property. It will be
   * used unless an explicit from address is set on the
   * Email
   */
  from: {
    address: env.get('MAIL_FROM_ADDRESS', 'noreply@benicio.juridicai.com.br'),
    name: env.get('MAIL_FROM_NAME', 'Benício'),
  },

  /**
   * The mailers object can be used to configure multiple mailers
   * each using a different transport or same transport with different
   * options.
   */
  mailers: {
    resend: transports.resend({
      key: resendKey,
      baseUrl: env.get('RESEND_BASE_URL', 'https://api.resend.com'),
    }),

    smtp: transports.smtp({
      host: env.get('SMTP_HOST', 'localhost'),
      port: env.get('SMTP_PORT'),
      secure: env.get('SMTP_PORT') === 465,
      auth: {
        type: 'login',
        user: env.get('SMTP_USER', ''),
        pass: env.get('SMTP_PASS', ''),
      },
    }),

    mailgun: transports.mailgun({
      key: env.get('MAILGUN_API_KEY', ''),
      domain: env.get('MAILGUN_DOMAIN', ''),
      baseUrl: env.get('MAILGUN_BASE_URL', 'https://api.mailgun.net/v3'),
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
