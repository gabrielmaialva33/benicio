import type { HttpContext } from '@adonisjs/core/http'

/** Post/Redirect/Get helper required by Inertia after non-GET form requests. */
export function inertiaRedirectTo(ctx: HttpContext, path: string): void {
  ctx.response.redirect().status(303).toPath(path)
}

/** Redirects to the validated same-origin referrer using a 303 response. */
export function inertiaRedirectBack(ctx: HttpContext): void {
  ctx.response.redirect().status(303).back()
}
