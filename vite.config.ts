import { readFileSync } from 'node:fs'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import adonisjs from '@adonisjs/vite/client'
import tailwindcss from '@tailwindcss/vite'

const { version: appVersion } = JSON.parse(
  readFileSync(`${import.meta.dirname}/package.json`, 'utf-8')
)

export default defineConfig({
  plugins: [
    react(),
    adonisjs({
      entryPoints: ['inertia/app/app.tsx'],
      serverEntryPoints: ['inertia/app/ssr.tsx'],
      reload: ['resources/views/**/*.edge'],
    }),
    tailwindcss(),
  ],

  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },

  /**
   * Define aliases for importing modules from
   * your frontend code
   */
  resolve: {
    alias: {
      '~/': `${import.meta.dirname}/inertia/`,
      /**
       * The RBAC vocabulary is owned by the backend. Aliasing the single
       * import-free catalogue file (never the whole `#modules` tree) lets the
       * frontend spell permissions with the same enum the routes use.
       */
      '#permissions': `${import.meta.dirname}/app/modules/permissions/interfaces/permission_catalog.ts`,
    },
  },
})
