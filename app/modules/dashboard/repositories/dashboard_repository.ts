import db from '@adonisjs/lucid/services/db'

interface FolderSummaryRow {
  total: number
  active: number
  completed: number
  new_this_month: number
}

interface TaskSummaryRow {
  total: number
  pending: number
  completed_today: number
  overdue: number
}

interface HearingSummaryRow {
  upcoming: number
  this_week: number
  this_month: number
}

interface DeadlineSummaryRow {
  open: number
  overdue: number
  due_this_week: number
  fatal_open: number
}

interface ClientSummaryRow {
  total: number
  active: number
  new_this_month: number
}

interface BreakdownRow {
  key: string
  count: number
}

interface MonthlyRow {
  month: string
  count: number
}

interface RawRows<Row> {
  rows: Row[]
}

export default class DashboardRepository {
  async folderSummary(tenantId: number): Promise<FolderSummaryRow> {
    const result = await db.rawQuery<RawRows<FolderSummaryRow>>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_TIMESTAMP))::int AS new_this_month
       FROM folders
       WHERE tenant_id = ? AND deleted_at IS NULL`,
      [tenantId]
    )
    return result.rows[0]
  }

  async folderByStatus(tenantId: number): Promise<BreakdownRow[]> {
    const result = await db.rawQuery<RawRows<BreakdownRow>>(
      `SELECT status AS key, COUNT(*)::int AS count
       FROM folders
       WHERE tenant_id = ? AND deleted_at IS NULL
       GROUP BY status
       ORDER BY status`,
      [tenantId]
    )
    return result.rows
  }

  async folderByArea(tenantId: number): Promise<BreakdownRow[]> {
    const result = await db.rawQuery<RawRows<BreakdownRow>>(
      `SELECT area AS key, COUNT(*)::int AS count
       FROM folders
       WHERE tenant_id = ? AND deleted_at IS NULL
       GROUP BY area
       ORDER BY count DESC, area`,
      [tenantId]
    )
    return result.rows
  }

  async folderMonthlyEvolution(tenantId: number): Promise<MonthlyRow[]> {
    const result = await db.rawQuery<RawRows<MonthlyRow>>(
      `WITH months AS (
         SELECT generate_series(
           date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '5 months',
           date_trunc('month', CURRENT_TIMESTAMP),
           INTERVAL '1 month'
         ) AS month
       )
       SELECT to_char(months.month, 'YYYY-MM') AS month, COUNT(folders.id)::int AS count
       FROM months
       LEFT JOIN folders
         ON folders.tenant_id = ?
        AND folders.deleted_at IS NULL
        AND folders.created_at >= months.month
        AND folders.created_at < months.month + INTERVAL '1 month'
       GROUP BY months.month
       ORDER BY months.month`,
      [tenantId]
    )
    return result.rows
  }

  async taskSummary(tenantId: number): Promise<TaskSummaryRow> {
    const result = await db.rawQuery<RawRows<TaskSummaryRow>>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress'))::int AS pending,
         COUNT(*) FILTER (
           WHERE status = 'completed' AND completed_at >= date_trunc('day', CURRENT_TIMESTAMP)
         )::int AS completed_today,
         COUNT(*) FILTER (
           WHERE status NOT IN ('completed', 'cancelled')
             AND due_date IS NOT NULL
             AND due_date < CURRENT_TIMESTAMP
         )::int AS overdue
       FROM tasks
       WHERE tenant_id = ? AND deleted_at IS NULL`,
      [tenantId]
    )
    return result.rows[0]
  }

  async tasksByPriority(tenantId: number): Promise<BreakdownRow[]> {
    const result = await db.rawQuery<RawRows<BreakdownRow>>(
      `SELECT priority AS key, COUNT(*)::int AS count
       FROM tasks
       WHERE tenant_id = ? AND deleted_at IS NULL
       GROUP BY priority
       ORDER BY priority`,
      [tenantId]
    )
    return result.rows
  }

  async hearingSummary(tenantId: number): Promise<HearingSummaryRow> {
    const result = await db.rawQuery<RawRows<HearingSummaryRow>>(
      `SELECT
         COUNT(*) FILTER (
           WHERE status IN ('scheduled', 'postponed') AND starts_at >= CURRENT_TIMESTAMP
         )::int AS upcoming,
         COUNT(*) FILTER (
           WHERE status IN ('scheduled', 'postponed')
             AND starts_at >= CURRENT_TIMESTAMP
             AND starts_at < date_trunc('week', CURRENT_TIMESTAMP) + INTERVAL '7 days'
         )::int AS this_week,
         COUNT(*) FILTER (
           WHERE status IN ('scheduled', 'postponed')
             AND starts_at >= CURRENT_TIMESTAMP
             AND starts_at < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
         )::int AS this_month
       FROM hearings
       WHERE tenant_id = ? AND deleted_at IS NULL`,
      [tenantId]
    )
    return result.rows[0]
  }

  async deadlineSummary(tenantId: number): Promise<DeadlineSummaryRow> {
    const result = await db.rawQuery<RawRows<DeadlineSummaryRow>>(
      `SELECT
         COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled'))::int AS open,
         COUNT(*) FILTER (
           WHERE status NOT IN ('completed', 'cancelled') AND due_at < CURRENT_TIMESTAMP
         )::int AS overdue,
         COUNT(*) FILTER (
           WHERE status NOT IN ('completed', 'cancelled')
             AND due_at >= CURRENT_TIMESTAMP
             AND due_at < CURRENT_TIMESTAMP + INTERVAL '7 days'
         )::int AS due_this_week,
         COUNT(*) FILTER (
           WHERE status NOT IN ('completed', 'cancelled') AND is_fatal = TRUE
         )::int AS fatal_open
       FROM deadlines
       WHERE tenant_id = ? AND deleted_at IS NULL`,
      [tenantId]
    )
    return result.rows[0]
  }

  async clientSummary(tenantId: number): Promise<ClientSummaryRow> {
    const result = await db.rawQuery<RawRows<ClientSummaryRow>>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM folders
             WHERE folders.tenant_id = clients.tenant_id
               AND folders.client_id = clients.id
               AND folders.status = 'active'
               AND folders.deleted_at IS NULL
           )
         )::int AS active,
         COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_TIMESTAMP))::int AS new_this_month
       FROM clients
       WHERE tenant_id = ? AND deleted_at IS NULL`,
      [tenantId]
    )
    return result.rows[0]
  }

  urgentTasks(tenantId: number, limit: number = 10) {
    return db
      .from('tasks as tasks')
      .leftJoin('users as assignee', 'assignee.id', 'tasks.assignee_id')
      .leftJoin('folders as folders', function () {
        this.on('folders.id', '=', 'tasks.folder_id').andOn(
          'folders.tenant_id',
          '=',
          'tasks.tenant_id'
        )
      })
      .where('tasks.tenant_id', tenantId)
      .whereNull('tasks.deleted_at')
      .whereNotIn('tasks.status', ['completed', 'cancelled'])
      .whereIn('tasks.priority', ['urgent', 'high'])
      .select(
        'tasks.id',
        'tasks.title',
        'tasks.status',
        'tasks.priority',
        'tasks.due_date',
        'tasks.folder_id',
        'tasks.process_id',
        'assignee.full_name as assignee_name',
        'folders.code as folder_code'
      )
      .orderByRaw('tasks.due_date ASC NULLS LAST')
      .orderBy('tasks.id', 'asc')
      .limit(limit)
  }

  upcomingHearings(tenantId: number, limit: number = 10) {
    return db
      .from('hearings as hearings')
      .innerJoin('processes as processes', function () {
        this.on('processes.id', '=', 'hearings.process_id').andOn(
          'processes.tenant_id',
          '=',
          'hearings.tenant_id'
        )
      })
      .innerJoin('folders as folders', function () {
        this.on('folders.id', '=', 'processes.folder_id').andOn(
          'folders.tenant_id',
          '=',
          'processes.tenant_id'
        )
      })
      .where('hearings.tenant_id', tenantId)
      .whereNull('hearings.deleted_at')
      .whereIn('hearings.status', ['scheduled', 'postponed'])
      .where('hearings.starts_at', '>=', new Date())
      .select(
        'hearings.id',
        'hearings.process_id',
        'hearings.title',
        'hearings.type',
        'hearings.status',
        'hearings.starts_at',
        'hearings.ends_at',
        'hearings.location',
        'hearings.online_url',
        'folders.id as folder_id',
        'folders.code as folder_code'
      )
      .orderBy('hearings.starts_at', 'asc')
      .limit(limit)
  }

  upcomingDeadlines(tenantId: number, limit: number = 10) {
    return db
      .from('deadlines as deadlines')
      .innerJoin('folders as folders', function () {
        this.on('folders.id', '=', 'deadlines.folder_id').andOn(
          'folders.tenant_id',
          '=',
          'deadlines.tenant_id'
        )
      })
      .leftJoin('users as assignee', 'assignee.id', 'deadlines.assignee_id')
      .where('deadlines.tenant_id', tenantId)
      .whereNull('deadlines.deleted_at')
      .whereNotIn('deadlines.status', ['completed', 'cancelled'])
      .select(
        'deadlines.id',
        'deadlines.folder_id',
        'deadlines.process_id',
        'deadlines.title',
        'deadlines.kind',
        'deadlines.status',
        'deadlines.priority',
        'deadlines.is_fatal',
        'deadlines.due_at',
        'folders.code as folder_code',
        'assignee.full_name as assignee_name'
      )
      .orderBy('deadlines.due_at', 'asc')
      .limit(limit)
  }

  favoriteFolders(tenantId: number, userId: number, limit: number = 10) {
    return db
      .from('folder_favorites as favorites')
      .innerJoin('folders as folders', function () {
        this.on('folders.id', '=', 'favorites.folder_id').andOn(
          'folders.tenant_id',
          '=',
          'favorites.tenant_id'
        )
      })
      .innerJoin('clients as clients', function () {
        this.on('clients.id', '=', 'folders.client_id').andOn(
          'clients.tenant_id',
          '=',
          'folders.tenant_id'
        )
      })
      .where('favorites.tenant_id', tenantId)
      .where('favorites.user_id', userId)
      .whereNull('folders.deleted_at')
      .select(
        'folders.id',
        'folders.code',
        'folders.title',
        'folders.status',
        'folders.area',
        'clients.name as client_name',
        'favorites.created_at as favorited_at'
      )
      .orderBy('favorites.created_at', 'desc')
      .limit(limit)
  }

  recentActivity(tenantId: number, limit: number = 10) {
    return db
      .from('activities as activities')
      .leftJoin('users as actor', 'actor.id', 'activities.actor_id')
      .where('activities.tenant_id', tenantId)
      .select(
        'activities.id',
        'activities.folder_id',
        'activities.process_id',
        'activities.actor_id',
        'activities.event_type',
        'activities.summary',
        'activities.data',
        'activities.occurred_at',
        'actor.full_name as actor_name'
      )
      .orderBy('activities.occurred_at', 'desc')
      .orderBy('activities.id', 'desc')
      .limit(limit)
  }
}
