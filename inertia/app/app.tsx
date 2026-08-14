/// <reference path="../../config/inertia.ts" />

import '../css/app.css'
import { hydrateRoot } from 'react-dom/client'
import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { ThemeProvider } from '~/providers/theme_provider'
import { QueryProvider } from '~/providers/query_provider'
import { Toaster } from '~/components/ui/sonner'

const appName = import.meta.env.VITE_APP_NAME || 'Benício'

createInertiaApp({
  progress: { color: '#f97316' },

  title: (title) => `${title} - ${appName}`,

  resolve: async (name) => {
    /**
     * `resolvePageComponent` resolves to the page *module*; Inertia v3's
     * resolver contract wants the component itself.
     */
    const moduloPagina = await resolvePageComponent<{ default: ResolvedComponent }>(
      `../pages/${name}.tsx`,
      import.meta.glob<{ default: ResolvedComponent }>('../pages/**/*.tsx')
    )

    return moduloPagina.default
  },

  setup({ el, App, props }) {
    hydrateRoot(
      el,
      <ThemeProvider
        attribute="class"
        forcedTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        <QueryProvider>
          <App {...props} />
          {/*
            `theme` is pinned rather than read from next-themes: the server
            renders before a theme is resolved, and letting it default to
            "system" produced a different class list on hydration.
          */}
          <Toaster position="top-right" theme="light" closeButton />
        </QueryProvider>
      </ThemeProvider>
    )
  },
})
