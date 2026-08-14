/*
|--------------------------------------------------------------------------
| Web (Inertia) Routes
|--------------------------------------------------------------------------
|
| Routes for Inertia.js pages that render React components
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import IPermission from '#modules/permissions/interfaces/permission_interface'

const InertiaAuthController = () => import('#modules/web/controllers/auth_controller')
const InertiaDashboardController = () => import('#modules/web/controllers/dashboard_controller')
const InertiaFoldersController = () => import('#modules/web/controllers/folders_controller')
const InertiaClientsController = () => import('#modules/web/controllers/clients_controller')
const InertiaUsersController = () => import('#modules/web/controllers/users_controller')
const InertiaFilesController = () => import('#modules/web/controllers/files_controller')
const InertiaTenantController = () => import('#modules/web/controllers/tenant_controller')
const InertiaRolesController = () => import('#modules/web/controllers/roles_controller')
const InertiaPermissionsController = () => import('#modules/web/controllers/permissions_controller')
const InertiaSettingsController = () => import('#modules/web/controllers/settings_controller')

// Public routes - with guest middleware to redirect authenticated users
router
  .get('/login', [InertiaAuthController, 'showLogin'])
  .as('login')
  .use(middleware.guest({ guards: ['jwt'] }))
router
  .post('/login', [InertiaAuthController, 'login'])
  .as('login.post')
  .use(middleware.guest({ guards: ['jwt'] }))
router
  .get('/register', [InertiaAuthController, 'showRegister'])
  .as('register')
  .use(middleware.guest({ guards: ['jwt'] }))
router
  .post('/register', [InertiaAuthController, 'register'])
  .as('register.post')
  .use(middleware.guest({ guards: ['jwt'] }))

// Root route redirects to dashboard if authenticated, otherwise to log in
router
  .get('/', async ({ auth, response, inertia }) => {
    try {
      await auth.use('jwt').authenticate()
      return response.redirect('/dashboard')
    } catch {
      return inertia.render('home', {})
    }
  })
  .as('home')

// Authenticated routes
router
  .group(() => {
    // Dashboard
    router
      .get('/dashboard', [InertiaDashboardController, 'index'])
      .as('dashboard')
      .use([
        middleware.tenant({ required: true }),
        middleware.permission({
          permissions: `${IPermission.Resources.DASHBOARD}.${IPermission.Actions.READ}`,
        }),
      ])

    // Folders
    router
      .group(() => {
        router
          .get('/', [InertiaFoldersController, 'index'])
          .as('web.folders.index')
          .use(
            middleware.permission({
              permissions: `${IPermission.Resources.FOLDERS}.${IPermission.Actions.LIST}`,
            })
          )
        router
          .get('/create', [InertiaFoldersController, 'create'])
          .as('web.folders.create')
          .use(
            middleware.permission({
              permissions: `${IPermission.Resources.FOLDERS}.${IPermission.Actions.CREATE}`,
            })
          )
        router
          .post('/', [InertiaFoldersController, 'store'])
          .as('web.folders.store')
          .use(
            middleware.permission({
              permissions: `${IPermission.Resources.FOLDERS}.${IPermission.Actions.CREATE}`,
            })
          )
        router
          .get('/:id', [InertiaFoldersController, 'show'])
          .where('id', /^[0-9]+$/)
          .as('web.folders.show')
          .use(
            middleware.permission({
              permissions: `${IPermission.Resources.FOLDERS}.${IPermission.Actions.READ}`,
            })
          )
      })
      .prefix('/folders')
      .use(middleware.tenant({ required: true }))

    // Clients
    router
      .group(() => {
        router
          .get('/', [InertiaClientsController, 'index'])
          .as('web.clients.index')
          .use(
            middleware.permission({
              permissions: `${IPermission.Resources.CLIENTS}.${IPermission.Actions.LIST}`,
            })
          )
        router
          .get('/create', [InertiaClientsController, 'create'])
          .as('web.clients.create')
          .use(
            middleware.permission({
              permissions: `${IPermission.Resources.CLIENTS}.${IPermission.Actions.CREATE}`,
            })
          )
        router
          .post('/', [InertiaClientsController, 'store'])
          .as('web.clients.store')
          .use(
            middleware.permission({
              permissions: `${IPermission.Resources.CLIENTS}.${IPermission.Actions.CREATE}`,
            })
          )
        router
          .get('/:id/edit', [InertiaClientsController, 'edit'])
          .where('id', /^[0-9]+$/)
          .as('web.clients.edit')
          .use(
            middleware.permission({
              permissions: `${IPermission.Resources.CLIENTS}.${IPermission.Actions.UPDATE}`,
            })
          )
        router
          .put('/:id', [InertiaClientsController, 'update'])
          .where('id', /^[0-9]+$/)
          .as('web.clients.update')
          .use(
            middleware.permission({
              permissions: `${IPermission.Resources.CLIENTS}.${IPermission.Actions.UPDATE}`,
            })
          )
        router
          .delete('/:id', [InertiaClientsController, 'destroy'])
          .where('id', /^[0-9]+$/)
          .as('web.clients.destroy')
          .use(
            middleware.permission({
              permissions: `${IPermission.Resources.CLIENTS}.${IPermission.Actions.DELETE}`,
            })
          )
        router
          .get('/:id', [InertiaClientsController, 'show'])
          .where('id', /^[0-9]+$/)
          .as('web.clients.show')
          .use(
            middleware.permission({
              permissions: `${IPermission.Resources.CLIENTS}.${IPermission.Actions.READ}`,
            })
          )
      })
      .prefix('/clients')
      .use(middleware.tenant({ required: true }))

    // UI Demo Page
    router
      .get('/ui-demo', async ({ inertia }) => {
        return inertia.render('ui_demo', {})
      })
      .as('ui-demo')

    // Data grid demo — exercises pinning, resizing and drag-and-drop
    router
      .get('/data-grid-demo', async ({ inertia }) => {
        return inertia.render('data_grid_demo', {})
      })
      .as('data-grid-demo')

    // Users - with permission check
    router
      .group(() => {
        router.get('/', [InertiaUsersController, 'index']).as('users.index')
        router.get('/create', [InertiaUsersController, 'create']).as('users.create')
        router.post('/', [InertiaUsersController, 'store']).as('users.store')
        router.get('/:id/edit', [InertiaUsersController, 'edit']).as('users.edit')
        router.put('/:id', [InertiaUsersController, 'update']).as('users.update')
        router.delete('/:id', [InertiaUsersController, 'destroy']).as('users.destroy')
      })
      .prefix('/users')
      .use(
        middleware.permission({
          permissions: 'users.list',
        })
      )

    // Files - with permission check
    router
      .get('/files', [InertiaFilesController, 'index'])
      .as('files.index')
      .use(
        middleware.permission({
          permissions: 'files.list',
        })
      )

    // Roles - with permission check
    router
      .get('/roles', [InertiaRolesController, 'index'])
      .as('roles.index')
      .use(
        middleware.permission({
          permissions: 'roles.list',
        })
      )

    // Permissions - with permission check
    router
      .get('/permissions', [InertiaPermissionsController, 'index'])
      .as('permissions.index')
      .use(
        middleware.permission({
          permissions: 'permissions.list',
        })
      )

    // Settings - only needs auth (own profile + workspaces)
    router.get('/settings', [InertiaSettingsController, 'index']).as('settings.index')
    router
      .post('/settings/profile', [InertiaSettingsController, 'updateProfile'])
      .as('settings.profile.update')

    // Switch the active tenant (re-mints the JWT cookie with the new tenantId)
    router.post('/tenant/switch', [InertiaTenantController, 'switch']).as('tenant.switch')

    // Logout
    router.post('/logout', [InertiaAuthController, 'logout']).as('logout')
  })
  .middleware([middleware.auth({ guards: ['jwt'] })])
