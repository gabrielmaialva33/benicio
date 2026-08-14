import { Head, Link, router } from '@inertiajs/react'
import {
  Bell,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  CircleAlert,
  Gavel,
  ListTodo,
  type LucideIcon,
  MessageSquare,
  Settings,
  TriangleAlert,
} from 'lucide-react'

import { Button } from '~/components/ui/button'
import { NativeSelect } from '~/components/ui/native-select'
import { useFlash } from '~/hooks/use_flash'
import { MainLayout } from '~/layouts'
import { cn } from '~/lib/utils'

type NotificationType =
  'info' | 'success' | 'warning' | 'error' | 'task' | 'hearing' | 'deadline' | 'message' | 'system'

interface WebNotification {
  id: number
  type: NotificationType
  title: string
  message: string
  read_at: string | null
  created_at: string
  action_url: string | null
  action_text: string | null
  actor_name: string | null
}

interface NotificationsPageProps {
  notifications: WebNotification[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
  filters: { filter: 'all' | 'unread' | 'read'; type: NotificationType | null }
  unread_count: number
  available_types: NotificationType[]
}

const typeIcons: Record<NotificationType, LucideIcon> = {
  info: Bell,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: CircleAlert,
  task: ListTodo,
  hearing: Gavel,
  deadline: CalendarClock,
  message: MessageSquare,
  system: Settings,
}

const typeLabels: Record<NotificationType, string> = {
  info: 'Informação',
  success: 'Sucesso',
  warning: 'Atenção',
  error: 'Erro',
  task: 'Tarefa',
  hearing: 'Audiência',
  deadline: 'Prazo',
  message: 'Mensagem',
  system: 'Sistema',
}

const FILTER_TABS = [
  { value: 'all', label: 'Todas' },
  { value: 'unread', label: 'Não lidas' },
  { value: 'read', label: 'Lidas' },
] as const

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data indisponível'

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function NotificationRow({ notification }: { notification: WebNotification }) {
  const Icon = typeIcons[notification.type]
  const unread = !notification.read_at

  /**
   * Opening a notification is also reading it, so the visit and the state
   * change go together — otherwise the badge keeps counting something the
   * reader has already dealt with.
   */
  const open = () => {
    router.post(
      `/notifications/${notification.id}/read`,
      {},
      {
        preserveScroll: true,
        onFinish: () => {
          if (notification.action_url) router.visit(notification.action_url)
        },
      }
    )
  }

  return (
    <li
      className={cn(
        'flex items-start gap-3 border-b border-gray-100 px-4 py-4 transition last:border-0 hover:bg-slate-50/70',
        unread && 'bg-orange-50/40'
      )}
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Icon className="size-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <strong className="min-w-0 flex-1 text-sm text-yol-ink">{notification.title}</strong>
          {unread && (
            <span
              className="mt-1.5 size-2 shrink-0 rounded-full bg-red-500"
              aria-label="Não lida"
            />
          )}
        </div>
        <p className="mt-1 text-sm leading-5 text-slate-600">{notification.message}</p>
        <p className="mt-1.5 text-xs text-slate-400">
          {[
            typeLabels[notification.type],
            notification.actor_name,
            formatDateTime(notification.created_at),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {notification.action_url && (
          <Button variant="outline" size="sm" onClick={open}>
            {notification.action_text ?? 'Abrir'}
          </Button>
        )}
        {unread && !notification.action_url && (
          <Button variant="ghost" size="sm" onClick={open}>
            Marcar como lida
          </Button>
        )}
      </div>
    </li>
  )
}

export default function NotificationsPage({
  notifications,
  meta,
  filters,
  unread_count: unreadCount,
  available_types: availableTypes,
}: NotificationsPageProps) {
  const flash = useFlash()

  const visit = (overrides: Record<string, string | number | undefined>) => {
    const query: Record<string, string | number> = { page: 1 }
    const next = { filter: filters.filter, type: filters.type ?? '', ...overrides }
    if (next.filter && next.filter !== 'all') query.filter = next.filter
    if (next.type) query.type = next.type
    if (overrides.page) query.page = overrides.page

    router.get('/notifications', query, { preserveScroll: true, preserveState: true })
  }

  return (
    <MainLayout>
      <Head title="Notificações" />

      <div className="space-y-4">
        {flash?.success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {flash.success}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-4">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => visit({ filter: tab.value })}
                  aria-pressed={filters.filter === tab.value}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-semibold transition',
                    filters.filter === tab.value
                      ? 'bg-white text-yol-ink shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {tab.label}
                  {tab.value === 'unread' && unreadCount > 0 && (
                    <span className="ms-1.5 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {availableTypes.length > 1 && (
                <NativeSelect
                  selectSize="sm"
                  containerClassName="w-44"
                  aria-label="Filtrar por tipo"
                  value={filters.type ?? ''}
                  onChange={(event) => visit({ type: event.target.value })}
                >
                  <option value="">Todos os tipos</option>
                  {availableTypes.map((type) => (
                    <option key={type} value={type}>
                      {typeLabels[type]}
                    </option>
                  ))}
                </NativeSelect>
              )}
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.post('/notifications/read-all', {}, { preserveScroll: true })
                  }
                >
                  <CheckCheck className="size-4" aria-hidden="true" />
                  Marcar todas como lidas
                </Button>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-16 text-center text-sm text-slate-500">
              {filters.filter === 'unread'
                ? 'Nenhuma notificação pendente. Tudo em dia.'
                : 'Nenhuma notificação por aqui.'}
            </p>
          ) : (
            <ul>
              {notifications.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} />
              ))}
            </ul>
          )}

          {meta.last_page > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
              <span className="text-sm text-slate-500">
                {meta.total} {meta.total === 1 ? 'notificação' : 'notificações'}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.current_page <= 1}
                  onClick={() => visit({ page: meta.current_page - 1 })}
                >
                  Anterior
                </Button>
                <span className="text-sm tabular-nums text-slate-500">
                  {meta.current_page} de {meta.last_page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() => visit({ page: meta.current_page + 1 })}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </section>

        <p className="text-center text-xs text-slate-400">
          As notificações também aparecem no sino do topo.{' '}
          <Link href="/settings" className="font-semibold text-yol-cyan hover:underline">
            Ajustar preferências
          </Link>
        </p>
      </div>
    </MainLayout>
  )
}
