import app from '@adonisjs/core/services/app'
import { ExceptionHandler, type HttpContext } from '@adonisjs/core/http'
import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'

import { inertiaRedirectBack } from '#shared/http/inertia_redirect'
import { resolveHomeRoute } from '#shared/http/resolve_home_route'

function toInputErrorsBag(messages: unknown): Record<string, string[]> {
  if (!Array.isArray(messages)) {
    return { general: ['Não foi possível validar os dados enviados.'] }
  }

  const errors: Record<string, string[]> = {}
  for (const item of messages) {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('field' in item) ||
      typeof item.field !== 'string' ||
      !('message' in item) ||
      typeof item.message !== 'string'
    ) {
      continue
    }

    errors[item.field] ??= []
    errors[item.field].push(item.message)
  }

  return Object.keys(errors).length > 0
    ? errors
    : { general: ['Não foi possível validar os dados enviados.'] }
}

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Status pages are used to display a custom HTML pages for certain error
   * codes. You might want to enable them in production only, but feel
   * free to enable them in development as well.
   */
  protected renderStatusPages = app.inProduction

  /**
   * Status pages is a collection of error code range and a callback
   * to return the HTML contents to send as a response.
   */
  protected statusPages: Record<StatusPageRange, StatusPageRenderer> = {
    '404': (error, { inertia }) => inertia.render('errors/not_found', { error }),
    '500..599': (error, { inertia }) => inertia.render('errors/server_error', { error }),
  }

  /**
   * Renderiza o 403 como página Inertia em qualquer ambiente. As `statusPages`
   * só valem em produção, então sem isto o usuário bloqueado vê o JSON cru do
   * erro no meio da tela durante o desenvolvimento.
   */
  async #handleForbidden(ctx: HttpContext) {
    const usuario = ctx.auth?.user
    const fallbackPath = usuario ? await resolveHomeRoute(usuario.id) : '/login'

    const paginaDeErro = await ctx.inertia.render('errors/forbidden', {
      attemptedPath: ctx.request.url(),
      fallbackPath,
    })

    // O retorno do exception handler não vira corpo sozinho: o Adonis só envia
    // o que for passado explicitamente para o response.
    return ctx.response.status(403).send(paginaDeErro)
  }

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    /**
     * Handle validation errors from VineJS
     */
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'E_VALIDATION_ERROR'
    ) {
      const validationError = error as { messages?: unknown }
      if (ctx.request.accepts(['html', 'json']) === 'json') {
        return ctx.response.status(422).json({
          errors: validationError.messages || [],
        })
      }
      ctx.session.flashAll()
      ctx.session.flash('inputErrorsBag', toInputErrorsBag(validationError.messages))
      return inertiaRedirectBack(ctx)
    }

    /**
     * Handle authorization errors (Inertia/HTML only — APIs keep the JSON body)
     */
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      error.status === 403 &&
      ctx.request.accepts(['html', 'json']) !== 'json'
    ) {
      return this.#handleForbidden(ctx)
    }

    /**
     * Handle rate limiting errors
     */
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'E_TOO_MANY_REQUESTS'
    ) {
      const rateLimitError = error as any

      // Set rate limit headers from the response object
      if (rateLimitError.response) {
        ctx.response.header('x-ratelimit-limit', rateLimitError.response.limit)
        ctx.response.header('x-ratelimit-remaining', rateLimitError.response.remaining)
        ctx.response.header('retry-after', rateLimitError.response.availableIn)
      }

      return ctx.response.status(429).json({
        errors: [
          {
            code: 'E_TOO_MANY_REQUESTS',
            message: rateLimitError.message || 'Too many requests',
            status: 429,
          },
        ],
      })
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
