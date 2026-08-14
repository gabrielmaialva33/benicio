export type ShellNotificationType =
  'info' | 'success' | 'warning' | 'error' | 'task' | 'hearing' | 'deadline' | 'message' | 'system'

export interface ShellPerson {
  id: number
  full_name: string
}

export interface ShellNotification {
  id: number
  type: ShellNotificationType
  title: string
  message: string
  read_at: string | null
  action_url: string | null
  action_text: string | null
  created_at: string
  actor?: ShellPerson | null
}

export interface ShellMessage {
  id: number
  subject: string
  body: string
  priority: 'low' | 'normal' | 'high'
  read_at: string | null
  created_at: string
  sender?: ShellPerson | null
}

export interface ShellFavoriteFolder {
  id: number
  code: string
  title: string
  area: string
  /** Processes filed under the folder; shown as the sidebar badge. */
  processes_count: number
}

export interface ShellFeed<TItem> {
  items: TItem[]
  unreadCount: number
}
