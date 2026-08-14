/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { throttle } from '#start/limiter'

import router from '@adonisjs/core/services/router'

import '#modules/auth/routes'
import '#modules/users/routes'
import '#modules/roles/routes'
import '#modules/permissions/routes'
import '#modules/files/routes'
import '#modules/tenants/routes'
import '#modules/health/routes'
import '#modules/clients/routes'
import '#modules/folders/routes'
import '#modules/processes/routes'
import '#modules/tasks/routes'
import '#modules/hearings/routes'
import '#modules/deadlines/routes'
import '#modules/movements/routes'
import '#modules/activities/routes'
import '#modules/documents/routes'
import '#modules/favorites/routes'
import '#modules/dashboard/routes'

import '#modules/web/routes'

router
  .get('/version', async () => {
    const packageJsonPath = join(process.cwd(), 'package.json')
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
    return {
      name: packageJson.name,
      description: packageJson.description,
      version: packageJson.version,
      author: packageJson.author,
      contributors: packageJson.contributors,
    }
  })
  .use(throttle)
