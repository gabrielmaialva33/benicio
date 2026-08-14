import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { Secret } from '@adonisjs/core/helpers'
import { defineConfig } from '@adonisjs/core/http'

/**
 * The app key is used for encrypting cookies, generating signed URLs,
 * and by the "encryption" module.
 *
 * The encryption module will fail to decrypt data if the key is lost or
 * changed. Therefore it is recommended to keep the app key secure.
 */
export const appKey = new Secret(env.get('APP_KEY'))

/**
 * In production the app only ever answers Caddy, which lives on the compose
 * bridge network — a private address, never loopback. The default `loopback`
 * predicate would therefore reject the hop and make `request.ip()` report the
 * proxy for every visitor, collapsing all rate-limiter keys into one bucket.
 * Trusting private ranges (and only those) restores the real client address.
 */
function isPrivateProxyAddress(address: string): boolean {
  const normalized = address.startsWith('::ffff:') ? address.slice(7) : address

  return (
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    /^10\./.test(normalized) ||
    /^192\.168\./.test(normalized) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(normalized) ||
    /^f[cd][0-9a-f]{2}:/i.test(normalized)
  )
}

/**
 * The configuration settings used by the HTTP server
 */
export const http = defineConfig({
  generateRequestId: true,
  allowMethodSpoofing: false,
  trustProxy: isPrivateProxyAddress,

  /**
   * Enabling async local storage will let you access HTTP context
   * from anywhere inside your application.
   */
  useAsyncLocalStorage: true,

  /**
   * Manage cookies configuration. The settings for the session id cookie are
   * defined inside the "config/session.ts" file.
   */
  cookie: {
    domain: '',
    path: '/',
    maxAge: '2h',
    httpOnly: true,
    secure: app.inProduction,
    sameSite: 'lax',
  },
})
