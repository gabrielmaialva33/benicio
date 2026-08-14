import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

import DashboardRepository from '#modules/dashboard/repositories/dashboard_repository'
import type { DashboardSummary } from '#modules/dashboard/interfaces/dashboard_interface'

@inject()
export default class DashboardService {
  constructor(private dashboardRepository: DashboardRepository) {}

  async overview(tenantId: number, userId: number) {
    const [
      summary,
      urgentTasks,
      upcomingHearings,
      upcomingDeadlines,
      favoriteFolders,
      recentActivity,
    ] = await Promise.all([
      this.summary(tenantId),
      this.dashboardRepository.urgentTasks(tenantId),
      this.dashboardRepository.upcomingHearings(tenantId),
      this.dashboardRepository.upcomingDeadlines(tenantId),
      this.dashboardRepository.favoriteFolders(tenantId, userId),
      this.dashboardRepository.recentActivity(tenantId),
    ])

    return {
      generated_at: DateTime.utc().toISO(),
      ...summary,
      urgent_tasks: urgentTasks,
      upcoming_hearings: upcomingHearings,
      upcoming_deadlines: upcomingDeadlines,
      favorite_folders: favoriteFolders,
      recent_activity: recentActivity,
    }
  }

  async summary(tenantId: number): Promise<DashboardSummary> {
    const [
      folders,
      folderStatuses,
      folderAreas,
      folderMonthlyEvolution,
      tasks,
      taskPriorities,
      hearings,
      deadlines,
      clients,
    ] = await Promise.all([
      this.dashboardRepository.folderSummary(tenantId),
      this.dashboardRepository.folderByStatus(tenantId),
      this.dashboardRepository.folderByArea(tenantId),
      this.dashboardRepository.folderMonthlyEvolution(tenantId),
      this.dashboardRepository.taskSummary(tenantId),
      this.dashboardRepository.tasksByPriority(tenantId),
      this.dashboardRepository.hearingSummary(tenantId),
      this.dashboardRepository.deadlineSummary(tenantId),
      this.dashboardRepository.clientSummary(tenantId),
    ])

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
