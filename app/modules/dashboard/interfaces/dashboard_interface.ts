export interface CountBreakdown {
  count: number
  percentage: number
}

export interface DashboardSummary {
  folders: {
    total: number
    active: number
    completed: number
    new_this_month: number
    by_status: Array<CountBreakdown & { status: string }>
    by_area: Array<CountBreakdown & { area: string }>
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
}
