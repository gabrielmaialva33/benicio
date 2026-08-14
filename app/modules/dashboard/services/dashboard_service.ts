import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

import DashboardRepository from '#modules/dashboard/repositories/dashboard_repository'
import type {
  DashboardOverview,
  DashboardSummary,
} from '#modules/dashboard/interfaces/dashboard_interface'

@inject()
export default class DashboardService {
  constructor(private dashboardRepository: DashboardRepository) {}

  async overview(tenantId: number, userId: number): Promise<DashboardOverview> {
    // A transaction provides one PostgreSQL connection, so these stay
    // sequential and remain safe when the dashboard is composed inside one.
    const summary = await this.summary(tenantId)
    const urgentTasks = await this.dashboardRepository.urgentTasks(tenantId)
    const upcomingHearings = await this.dashboardRepository.upcomingHearings(tenantId)
    const upcomingDeadlines = await this.dashboardRepository.upcomingDeadlines(tenantId)
    const favoriteFolders = await this.dashboardRepository.favoriteFolders(tenantId, userId)
    const recentActivity = await this.dashboardRepository.recentActivity(tenantId)

    return {
      generated_at: DateTime.utc().toISO()!,
      ...summary,
      urgent_tasks: urgentTasks,
      upcoming_hearings: upcomingHearings,
      upcoming_deadlines: upcomingDeadlines,
      favorite_folders: favoriteFolders,
      recent_activity: recentActivity,
    }
  }

  async summary(tenantId: number): Promise<DashboardSummary> {
    const folders = await this.dashboardRepository.folderSummary(tenantId)
    const folderStatuses = await this.dashboardRepository.folderByStatus(tenantId)
    const folderAreas = await this.dashboardRepository.folderByArea(tenantId)
    const folderMonthlyEvolution = await this.dashboardRepository.folderMonthlyEvolution(tenantId)
    const tasks = await this.dashboardRepository.taskSummary(tenantId)
    const taskPriorities = await this.dashboardRepository.tasksByPriority(tenantId)
    const hearings = await this.dashboardRepository.hearingSummary(tenantId)
    const deadlines = await this.dashboardRepository.deadlineSummary(tenantId)
    const clients = await this.dashboardRepository.clientSummary(tenantId)

    return {
      folders: {
        ...folders,
        by_status: folderStatuses.map((row) => ({
          status: row.key,
          count: row.count,
          percentage: this.percentage(row.count, folders.total),
        })),
        by_area: folderAreas.map((row) => ({
          area: row.key,
          count: row.count,
          percentage: this.percentage(row.count, folders.total),
        })),
        monthly_evolution: folderMonthlyEvolution,
      },
      tasks: {
        ...tasks,
        by_priority: taskPriorities.map((row) => ({ priority: row.key, count: row.count })),
      },
      hearings,
      deadlines,
      clients,
    }
  }

  urgentTasks(tenantId: number, limit: number) {
    return this.dashboardRepository.urgentTasks(tenantId, limit)
  }

  upcomingHearings(tenantId: number, limit: number) {
    return this.dashboardRepository.upcomingHearings(tenantId, limit)
  }

  upcomingDeadlines(tenantId: number, limit: number) {
    return this.dashboardRepository.upcomingDeadlines(tenantId, limit)
  }

  favoriteFolders(tenantId: number, userId: number, limit: number) {
    return this.dashboardRepository.favoriteFolders(tenantId, userId, limit)
  }

  recentActivity(tenantId: number, limit: number) {
    return this.dashboardRepository.recentActivity(tenantId, limit)
  }

  private percentage(count: number, total: number): number {
    return total === 0 ? 0 : Math.round((count / total) * 10_000) / 100
  }
}
