import { router } from '@inertiajs/react'
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Gavel,
  ListTodo,
  MessageSquare,
  Settings,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Skeleton } from '~/components/ui/skeleton'
import { useMessageFeed, useNotificationFeed } from '~/hooks/use_shell_data'
import { cn } from '~/lib/utils'
import type { ShellMessage, ShellNotification, ShellNotificationType } from '~/types/shell'

const notificationIcons: Record<ShellNotificationType, LucideIcon> = {
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

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'Data indisponível'

  const elapsedSeconds = Math.round((timestamp - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
  const intervals = [
    { seconds: 31_536_000, unit: 'year' },
    { seconds: 2_592_000, unit: 'month' },
    { seconds: 86_400, unit: 'day' },
    { seconds: 3_600, unit: 'hour' },
    { seconds: 60, unit: 'minute' },
  ] as const

  for (const interval of intervals) {
    if (Math.abs(elapsedSeconds) >= interval.seconds) {
      return formatter.format(Math.round(elapsedSeconds / interval.seconds), interval.unit)
    }
  }

  return formatter.format(elapsedSeconds, 'second')
}

function ActivityTrigger({
  label,
  unreadCount,
  children,
}: {
  label: string
  unreadCount: number
  children: ReactNode
}) {
  const accessibleLabel = unreadCount > 0 ? `${label}, ${unreadCount} não lidas` : label

  return (
    <button
      type="button"
      aria-label={accessibleLabel}
      className="relative flex size-9 items-center justify-center rounded-md text-gray-500 transition hover:bg-white/60 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
    >
      {children}
      {unreadCount > 0 && (
        <span className="absolute right-1 top-1 size-2 rounded-full bg-red-600 ring-2 ring-yol-page" />
      )}
    </button>
  )
}

function FeedStatus({
  hasTenant,
  pending,
  error,
  empty,
  onRetry,
}: {
  hasTenant: boolean
  pending: boolean
  error: boolean
  empty: boolean
  onRetry: () => void
}) {
  if (!hasTenant) {
    return <p className="px-5 py-10 text-center text-sm text-slate-500">Sem escritório ativo.</p>
  }
  if (pending) {
    return (
      <div className="space-y-3 p-4" aria-label="Carregando atualizações">
        {[1, 2, 3].map((item) => (
          <div key={item} className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (error) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-sm text-slate-500">Não foi possível carregar agora.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-xs font-bold text-[#f97316] hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    )
  }
  if (empty) {
    return <p className="px-5 py-10 text-center text-sm text-slate-500">Nada novo por aqui.</p>
  }
  return null
}

function FeedHeader({
  title,
  unreadCount,
  markingAll,
  onMarkAll,
}: {
  title: string
  unreadCount: number
  markingAll: boolean
  onMarkAll: () => void
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-white/10">
      <div>
        <h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {unreadCount > 0 ? `${unreadCount} não lidas` : 'Tudo em dia'}
        </p>
      </div>
      {unreadCount > 0 && (
        <button
          type="button"
          disabled={markingAll}
          onClick={onMarkAll}
          className="text-xs font-bold text-[#f97316] hover:underline disabled:opacity-50"
        >
          Marcar todas como lidas
        </button>
      )}
    </header>
  )
}

function NotificationItem({
  notification,
  onActivate,
}: {
  notification: ShellNotification
  onActivate: () => void
}) {
  const Icon = notificationIcons[notification.type]
  const actorName = notification.actor?.full_name

  return (
    <button
      type="button"
      onClick={onActivate}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/5',
        !notification.read_at && 'bg-orange-50/45 dark:bg-orange-500/5'
      )}
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <strong className="min-w-0 flex-1 truncate text-sm text-slate-900 dark:text-white">
            {notification.title}
          </strong>
          {!notification.read_at && (
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-red-500" />
          )}
        </span>
        <span className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
          {notification.message}
        </span>
        <span className="mt-1.5 block text-[0.68rem] text-slate-400">
          {[actorName, relativeTime(notification.created_at)].filter(Boolean).join(' · ')}
        </span>
      </span>
    </button>
  )
}

function MessageItem({ message, onActivate }: { message: ShellMessage; onActivate: () => void }) {
  const senderName = message.sender?.full_name ?? 'Sistema'

  return (
    <button
      type="button"
      onClick={onActivate}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/5',
        !message.read_at && 'bg-orange-50/45 dark:bg-orange-500/5'
      )}
    >
      <Avatar className="size-9 shrink-0 rounded-xl">
        <AvatarFallback className="rounded-xl bg-[#373737] text-[0.68rem] font-bold text-white">
          {initialsOf(senderName)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <strong className="min-w-0 flex-1 truncate text-sm text-slate-900 dark:text-white">
            {message.subject}
          </strong>
          {!message.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-red-500" />}
        </span>
        <span className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{message.body}</span>
        <span className="mt-1.5 block text-[0.68rem] text-slate-400">
          {senderName} · {relativeTime(message.created_at)}
        </span>
      </span>
    </button>
  )
}

function NotificationsPopover() {
  const feed = useNotificationFeed()
  const unreadCount = feed.data?.unreadCount ?? 0
  const items = feed.data?.items ?? []

  const activate = (notification: ShellNotification) => {
    const visit = () => {
      if (notification.action_url) router.visit(notification.action_url)
    }
    if (notification.read_at) {
      visit()
      return
    }
    feed.markRead.mutate(notification.id, { onSettled: visit })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <ActivityTrigger label="Notificações" unreadCount={unreadCount}>
          <img src="/yol/icons/bell.svg" alt="" width={22} height={22} className="size-[22px]" />
        </ActivityTrigger>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <FeedHeader
          title="Notificações"
          unreadCount={unreadCount}
          markingAll={feed.markAllRead.isPending}
          onMarkAll={() => feed.markAllRead.mutate()}
        />
        <FeedStatus
          hasTenant={feed.hasTenant}
          pending={feed.isPending}
          error={feed.isError}
          empty={!feed.isPending && !feed.isError && items.length === 0}
          onRetry={() => void feed.refetch()}
        />
        {items.length > 0 && (
          <div className="max-h-[min(28rem,70vh)] divide-y divide-slate-100 overflow-y-auto dark:divide-white/10">
            {items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onActivate={() => activate(notification)}
              />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function MessagesPopover() {
  const feed = useMessageFeed()
  const unreadCount = feed.data?.unreadCount ?? 0
  const items = feed.data?.items ?? []

  return (
    <Popover>
      <PopoverTrigger asChild>
        <ActivityTrigger label="Mensagens" unreadCount={unreadCount}>
          <img
            src="/yol/icons/messages.svg"
            alt=""
            width={22}
            height={22}
            className="size-[22px]"
          />
        </ActivityTrigger>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <FeedHeader
          title="Mensagens"
          unreadCount={unreadCount}
          markingAll={feed.markAllRead.isPending}
          onMarkAll={() => feed.markAllRead.mutate()}
        />
        <FeedStatus
          hasTenant={feed.hasTenant}
          pending={feed.isPending}
          error={feed.isError}
          empty={!feed.isPending && !feed.isError && items.length === 0}
          onRetry={() => void feed.refetch()}
        />
        {items.length > 0 && (
          <div className="max-h-[min(28rem,70vh)] divide-y divide-slate-100 overflow-y-auto dark:divide-white/10">
            {items.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                onActivate={() => {
                  if (!message.read_at) feed.markRead.mutate(message.id)
                }}
              />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function HeaderActivity() {
  const openAgenda = () => {
    router.visit('/dashboard', {
      preserveScroll: false,
      onSuccess: () => {
        requestAnimationFrame(() => {
          document.getElementById('agenda')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      },
    })
  }

  return (
    <>
      <NotificationsPopover />
      <button
        type="button"
        aria-label="Abrir agenda"
        onClick={openAgenda}
        className="flex size-9 items-center justify-center rounded-md text-gray-500 transition hover:bg-white/60 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
      >
        <img src="/yol/icons/calendar.svg" alt="" width={22} height={22} className="size-[22px]" />
      </button>
      <MessagesPopover />
    </>
  )
}
