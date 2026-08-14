export interface DashboardBreakdown {
  count: number
  percentage: number
}

export interface DashboardUrgentTask {
  id: number
  title: string
  status: string
  priority: string
  due_date: string | null
  folder_id: number | null
  process_id: number | null
  assignee_name: string | null
  folder_code: string | null
}

export interface DashboardUpcomingHearing {
  id: number
  process_id: number
  title: string
  type: string
  status: string
  starts_at: string
  ends_at: string | null
  location: string | null
  online_url: string | null
  folder_id: number
  folder_code: string
}

export interface DashboardUpcomingDeadline {
  id: number
  folder_id: number
  process_id: number | null
  title: string
  kind: string
  status: string
  priority: string
  is_fatal: boolean
  due_at: string
  folder_code: string
  assignee_name: string | null
}

export interface DashboardFavoriteFolder {
  id: number
  code: string
  title: string
  status: string
  area: string
  client_name: string
  favorited_at: string
}

export interface DashboardRecentActivity {
  id: number
  folder_id: number | null
  process_id: number | null
  actor_id: number | null
  event_type: string
  summary: string
  data: unknown
  occurred_at: string
  actor_name: string | null
}

export interface DashboardOverview {
  generated_at: string | null
  folders: {
    total: number
    active: number
    completed: number
    new_this_month: number
    by_status: Array<DashboardBreakdown & { status: string }>
    by_area: Array<DashboardBreakdown & { area: string }>
    monthly_evolution: Array<{ month: string; count: number }>
  }
  tasks: {
    total: number
    pending: number
    completed_today: number
    overdue: number
    by_priority: Array<{ priority: string; count: number }>
  }
  hearings: {
    upcoming: number
    this_week: number
    this_month: number
  }
  deadlines: {
    open: number
    overdue: number
    due_this_week: number
    fatal_open: number
  }
  clients: {
    total: number
    active: number
    new_this_month: number
  }
  urgent_tasks: DashboardUrgentTask[]
  upcoming_hearings: DashboardUpcomingHearing[]
  upcoming_deadlines: DashboardUpcomingDeadline[]
  favorite_folders: DashboardFavoriteFolder[]
  recent_activity: DashboardRecentActivity[]
}
