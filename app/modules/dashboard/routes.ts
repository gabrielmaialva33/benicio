import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import IPermission from '#modules/permissions/interfaces/permission_interface'

const DashboardController = () => import('#modules/dashboard/controllers/dashboard_controller')
const readDashboard = middleware.permission({
  permissions: `${IPermission.Resources.DASHBOARD}.${IPermission.Actions.READ}`,
})

router
  .group(() => {
    router.get('/', [DashboardController, 'show']).as('dashboard.show')
    router.get('/stats', [DashboardController, 'stats']).as('dashboard.stats')
    router.get('/urgent-tasks', [DashboardController, 'urgentTasks']).as('dashboard.urgent-tasks')
    router
      .get('/upcoming-hearings', [DashboardController, 'upcomingHearings'])
      .as('dashboard.upcoming-hearings')
    router
      .get('/upcoming-deadlines', [DashboardController, 'upcomingDeadlines'])
      .as('dashboard.upcoming-deadlines')
    router
      .get('/favorite-folders', [DashboardController, 'favoriteFolders'])
      .as('dashboard.favorite-folders')
    router
      .get('/recent-activity', [DashboardController, 'recentActivity'])
      .as('dashboard.recent-activity')
  })
  .use([middleware.auth(), middleware.tenant({ required: true }), readDashboard, apiThrottle])
  .prefix('/api/v1/dashboard')
