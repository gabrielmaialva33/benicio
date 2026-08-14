import { renderToString } from 'react-dom/server'
import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react'
import type { RenderInertiaSsrApp } from '@adonisjs/inertia/types'

import { ThemeProvider } from '~/providers/theme_provider'
import { QueryProvider } from '~/providers/query_provider'

/**
 * Inertia's own page shape, pulled from `createInertiaApp` so we don't have to
 * depend on `@inertiajs/core` just for the type.
 */
type InertiaPage =NonNullable<NonNullable<Parameters<typeof createInertiaApp>[0]>['page']>

const render: RenderInertiaSsrApp = (page) => {
  return createInertiaApp({
    /**
     * AdonisJS hands over a `PageObject`, whose shape is looser than Inertia's
     * `Page` (optional `rescuedProps`, `version` as `string | number`, no
     * `rememberedState`). Those fields belong to the client-side history
     * adapter and are not read while rendering on the server, so the only
     * one worth defaulting is `rememberedState`.
     */
    page: { rememberedState: {}, ...page } as InertiaPage,
    render: renderToString,
    resolve: (name) => {
      const pages = import.meta.glob<{ default: ResolvedComponent }>('../pages/**/*.tsx', {
        eager: true,
      })

      return pages[`../pages/${name}.tsx`].default
    },
    setup: ({ App, props }) => (
      <ThemeProvider
        attribute="class"
        forcedTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        <QueryProvider>
          <App {...props} />
        </QueryProvider>
      </ThemeProvider>
    ),
  })
}

export default render
