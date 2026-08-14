import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FolderHeart,
  ListTodo,
  UsersRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'

import { cn } from '~/lib/utils'
import type {
  DashboardFavoriteFolder,
  DashboardOverview,
  DashboardRecentActivity,
  DashboardUpcomingDeadline,
  DashboardUpcomingHearing,
  DashboardUrgentTask,
} from '~/types/dashboard'

const areaPalette = ['#00a76f', '#00b8d9', '#ffab00', '#ff5630', '#7c3aed', '#64748b']

const statusLabels: Record<string, string> = {
  active: 'Ativas',
  completed: 'Concluídas',
  pending: 'Pendentes',
  cancelled: 'Canceladas',
  archived: 'Arquivadas',
  in_progress: 'Em andamento',
}

const priorityLabels: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value)
}

function formatMonth(value: string) {
  const date = new Date(`${value}-01T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '')
}

function formatDateTime(value: string | null) {
  if (!value) return 'Sem data definida'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data inválida'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(date)
    .replace('.', '')
}

function isPast(value: string | null) {
  if (!value) return false
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) && timestamp < Date.now()
}

interface DashboardCardProps {
  title: string
  children: ReactNode
  className?: string
  titleAside?: ReactNode
}

function DashboardCard({ title, children, className, titleAside }: DashboardCardProps) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.035)] dark:border-white/10 dark:bg-card',
        className
      )}
    >
      <header className="mb-5 flex min-h-7 items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-[-0.025em] text-[#1f2a37] dark:text-white">
          {title}
        </h2>
        {titleAside}
      </header>
      {children}
    </section>
  )
}

function EmptyMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-sm text-slate-400 dark:border-white/10">
      {children}
    </div>
  )
}

function ActiveFoldersCard({ dashboard }: { dashboard: DashboardOverview }) {
  const chartData = dashboard.folders.monthly_evolution.map((point) => ({
    ...point,
    label: formatMonth(point.month),
  }))

  return (
    <DashboardCard title="Pastas ativas" className="justify-between">
      <div>
        <strong className="block text-5xl font-black tracking-[-0.06em] text-[#1f2a37] dark:text-white">
          {formatNumber(dashboard.folders.active)}
        </strong>
        <span className="mt-1 block text-sm text-slate-500">
          {formatNumber(dashboard.folders.new_this_month)} novas neste mês
        </span>
      </div>

      <div className="-mx-2 mt-4 h-24" aria-label="Evolução mensal de pastas">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" hide />
            <Tooltip
              cursor={{ stroke: '#cbd5e1', strokeDasharray: '3 3' }}
              formatter={(value) => [formatNumber(Number(value)), 'Pastas']}
              labelFormatter={(label) => String(label)}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#06b6d4"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4, fill: '#06b6d4' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-white/10">
        <span>{formatNumber(dashboard.folders.total)} no total</span>
        <span>{formatNumber(dashboard.folders.completed)} concluídas</span>
      </div>
    </DashboardCard>
  )
}

function AreaDivisionCard({ dashboard }: { dashboard: DashboardOverview }) {
  const data = dashboard.folders.by_area.slice(0, areaPalette.length).map((item, index) => ({
    name: item.area,
    value: item.count,
    percentage: item.percentage,
    color: areaPalette[index] ?? '#64748b',
  }))

  return (
    <DashboardCard title="Divisão por áreas">
      {data.length === 0 ? (
        <EmptyMessage>As áreas aparecem quando as primeiras pastas forem cadastradas.</EmptyMessage>
      ) : (
        <div className="grid flex-1 grid-cols-[minmax(120px,0.9fr)_minmax(0,1fr)] items-center gap-4">
          <div className="h-40 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="42%"
                  outerRadius="78%"
                  paddingAngle={2}
                  stroke="transparent"
                >
                  {data.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatNumber(Number(value)), 'Pastas']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="min-w-0 space-y-2.5">
            {data.map((item) => (
              <li key={item.name} className="flex min-w-0 items-center gap-2.5 text-sm">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="min-w-0 flex-1 truncate font-medium text-slate-600 dark:text-slate-300">
                  {item.name}
                </span>
                <strong className="tabular-nums text-slate-900 dark:text-white">
                  {item.percentage}%
                </strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardCard>
  )
}

function FolderActivityCard({ dashboard }: { dashboard: DashboardOverview }) {
  const statuses = dashboard.folders.by_status

  return (
    <DashboardCard title="Atividade de pastas">
      {statuses.length === 0 ? (
        <EmptyMessage>A distribuição por status será exibida aqui.</EmptyMessage>
      ) : (
        <div className="space-y-4">
          {statuses.map((status, index) => (
            <div key={status.status}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {statusLabels[status.status] ?? status.status}
                </span>
                <strong className="text-slate-900 dark:text-white">
                  {formatNumber(status.count)}
                </strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(0, status.percentage))}%`,
                    backgroundColor: areaPalette[index % areaPalette.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={cn(
        'rounded-md px-2 py-1 text-[0.66rem] font-bold uppercase tracking-wide',
        priority === 'urgent' && 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300',
        priority === 'high' &&
          'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300',
        priority === 'medium' &&
          'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
        priority === 'low' && 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'
      )}
    >
      {priorityLabels[priority] ?? priority}
    </span>
  )
}

function TaskRow({ task }: { task: DashboardUrgentTask }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-slate-100 px-3.5 py-3 transition hover:border-slate-200 hover:bg-slate-50/70 dark:border-white/10 dark:hover:bg-white/5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#fff4eb] text-[#f97316] dark:bg-orange-500/10">
        <ListTodo className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-800 dark:text-white">
          {task.title}
        </span>
        <span className="mt-1 block truncate text-xs text-slate-500">
          {[task.folder_code, task.assignee_name, formatDateTime(task.due_date)]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      <PriorityBadge priority={task.priority} />
    </li>
  )
}

function TasksCard({ dashboard }: { dashboard: DashboardOverview }) {
  return (
    <DashboardCard
      title="Suas tarefas urgentes"
      titleAside={
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
          {dashboard.tasks.pending} pendentes
        </span>
      }
    >
      {dashboard.urgent_tasks.length === 0 ? (
        <EmptyMessage>Nenhuma tarefa urgente. Bom trabalho.</EmptyMessage>
      ) : (
        <ul className="space-y-2.5">
          {dashboard.urgent_tasks.slice(0, 5).map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}

function DeadlineRow({ deadline }: { deadline: DashboardUpcomingDeadline }) {
  const overdue = isPast(deadline.due_at)

  return (
    <li className="flex items-start gap-3 rounded-xl border border-slate-100 px-3.5 py-3 dark:border-white/10">
      <span
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
          overdue || deadline.is_fatal
            ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300'
            : 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300'
        )}
      >
        {overdue ? <CircleAlert className="size-4" /> : <Clock3 className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-800 dark:text-white">
            {deadline.title}
          </span>
          {deadline.is_fatal && (
            <span className="rounded bg-red-50 px-1.5 py-0.5 text-[0.62rem] font-bold uppercase text-red-600 dark:bg-red-500/10 dark:text-red-300">
              Fatal
            </span>
          )}
        </span>
        <span className="mt-1 block truncate text-xs text-slate-500">
          {[deadline.folder_code, deadline.assignee_name].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span
        className={cn(
          'whitespace-nowrap text-xs font-semibold',
          overdue ? 'text-red-600 dark:text-red-300' : 'text-slate-500'
        )}
      >
        {formatDateTime(deadline.due_at)}
      </span>
    </li>
  )
}

function DeadlinesCard({ dashboard }: { dashboard: DashboardOverview }) {
  return (
    <DashboardCard
      title="Prazos próximos"
      titleAside={
        dashboard.deadlines.overdue > 0 ? (
          <span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 dark:bg-red-500/10 dark:text-red-300">
            {dashboard.deadlines.overdue} vencidos
          </span>
        ) : null
      }
    >
      {dashboard.upcoming_deadlines.length === 0 ? (
        <EmptyMessage>Nenhum prazo aberto para acompanhar.</EmptyMessage>
      ) : (
        <ul className="space-y-2.5">
          {dashboard.upcoming_deadlines.slice(0, 5).map((deadline) => (
            <DeadlineRow key={deadline.id} deadline={deadline} />
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}

function HearingRow({ hearing }: { hearing: DashboardUpcomingHearing }) {
  const date = new Date(hearing.starts_at)
  const validDate = !Number.isNaN(date.getTime())

  return (
    <li className="flex items-center gap-4 rounded-xl border border-slate-100 px-4 py-3.5 dark:border-white/10">
      <time
        dateTime={hearing.starts_at}
        className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#fff4eb] text-[#f97316] dark:bg-orange-500/10"
      >
        <strong className="text-lg leading-none">{validDate ? date.getDate() : '—'}</strong>
        <span className="mt-1 text-[0.62rem] font-bold uppercase">
          {validDate
            ? new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '')
            : ''}
        </span>
      </time>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-800 dark:text-white">
          {hearing.title}
        </span>
        <span className="mt-1 block truncate text-xs text-slate-500">
          {[hearing.folder_code, hearing.location, formatDateTime(hearing.starts_at)]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      <CalendarDays className="hidden size-5 text-slate-300 sm:block" />
    </li>
  )
}

function HearingsCard({ dashboard }: { dashboard: DashboardOverview }) {
  return (
    <DashboardCard
      title="Audiências"
      titleAside={
        <span className="text-xs font-semibold text-slate-500">
          {dashboard.hearings.this_week} nesta semana
        </span>
      }
    >
      {dashboard.upcoming_hearings.length === 0 ? (
        <EmptyMessage>Nenhuma audiência futura agendada.</EmptyMessage>
      ) : (
        <ul className="grid gap-2.5 xl:grid-cols-2">
          {dashboard.upcoming_hearings.slice(0, 6).map((hearing) => (
            <HearingRow key={hearing.id} hearing={hearing} />
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}

function ClientsCard({ dashboard }: { dashboard: DashboardOverview }) {
  return (
    <section className="rounded-2xl border border-emerald-100 bg-[#e6f8f3] p-5 text-[#004b50] shadow-[0_4px_18px_rgba(15,23,42,0.025)] dark:border-emerald-500/15 dark:bg-emerald-500/10 dark:text-emerald-100">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-[-0.025em]">Clientes ativos</h2>
          <strong className="mt-3 block text-4xl font-black tracking-[-0.05em]">
            {formatNumber(dashboard.clients.active)}
          </strong>
          <p className="mt-1 text-sm opacity-70">
            {dashboard.clients.new_this_month} novos neste mês
          </p>
        </div>
        <span className="flex size-12 items-center justify-center rounded-2xl bg-white/65 dark:bg-white/10">
          <UsersRound className="size-6" />
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-emerald-900/10 pt-3 text-xs font-semibold dark:border-white/10">
        <span>{dashboard.clients.total} cadastrados</span>
        <span>{dashboard.folders.active} pastas em andamento</span>
      </div>
    </section>
  )
}

function FavoriteRow({ folder }: { folder: DashboardFavoriteFolder }) {
  return (
    <li className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#f97316] dark:bg-orange-500/10">
        <FolderHeart className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-800 dark:text-white">
          {folder.code} · {folder.title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">
          {folder.client_name} · {folder.area}
        </span>
      </span>
    </li>
  )
}

function FavoritesCard({ dashboard }: { dashboard: DashboardOverview }) {
  return (
    <DashboardCard title="Pastas favoritas">
      {dashboard.favorite_folders.length === 0 ? (
        <EmptyMessage>As pastas marcadas como favoritas aparecem aqui.</EmptyMessage>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/10">
          {dashboard.favorite_folders.slice(0, 4).map((folder) => (
            <FavoriteRow key={folder.id} folder={folder} />
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}

function ActivityRow({ activity }: { activity: DashboardRecentActivity }) {
  return (
    <li className="relative grid gap-1 pb-5 ps-7 last:pb-0 before:absolute before:start-[0.45rem] before:top-2 before:h-full before:w-px before:bg-slate-200 last:before:hidden dark:before:bg-white/10">
      <span className="absolute start-0 top-1.5 size-4 rounded-full border-4 border-white bg-[#06b6d4] ring-1 ring-cyan-100 dark:border-card dark:ring-cyan-500/20" />
      <span className="text-sm font-semibold text-slate-800 dark:text-white">
        {activity.summary}
      </span>
      <span className="text-xs text-slate-500">
        {[activity.actor_name, formatDateTime(activity.occurred_at)].filter(Boolean).join(' · ')}
      </span>
    </li>
  )
}

function RecentActivityCard({ dashboard }: { dashboard: DashboardOverview }) {
  return (
    <DashboardCard title="Atividade recente">
      {dashboard.recent_activity.length === 0 ? (
        <EmptyMessage>Os eventos recentes do escritório aparecerão aqui.</EmptyMessage>
      ) : (
        <ol>
          {dashboard.recent_activity.slice(0, 6).map((activity) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))}
        </ol>
      )}
    </DashboardCard>
  )
}

export function DashboardContent({ dashboard }: { dashboard: DashboardOverview }) {
  return (
    <div data-testid="dashboard" className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-3">
        <ActiveFoldersCard dashboard={dashboard} />
        <AreaDivisionCard dashboard={dashboard} />
        <FolderActivityCard dashboard={dashboard} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <TasksCard dashboard={dashboard} />
        <DeadlinesCard dashboard={dashboard} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <HearingsCard dashboard={dashboard} />
        <div className="space-y-6">
          <ClientsCard dashboard={dashboard} />
          <FavoritesCard dashboard={dashboard} />
        </div>
      </div>

      <RecentActivityCard dashboard={dashboard} />

      <footer className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400">
        <span>Dados isolados pelo escritório ativo.</span>
        <span>
          Atualizado em {formatDateTime(dashboard.generated_at)}
          <CheckCircle2 className="ms-1.5 inline size-3.5 text-emerald-500" />
        </span>
      </footer>
    </div>
  )
}
