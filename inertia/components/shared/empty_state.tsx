import { Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '~/lib/utils'

interface EmptyStateProps {
  /** Short sentence stating what is missing, e.g. "Nenhuma pasta vinculada." */
  message: string
  description?: string
  icon?: LucideIcon
  /** Call to action — usually the button that creates the first record. */
  children?: ReactNode
  className?: string
}

/**
 * The single empty state for lists, tables and panels. Every list used to
 * hand-roll its own centred div, which is why the spacing and the icon size
 * drifted from screen to screen.
 */
export function EmptyState({
  message,
  description,
  icon: Icon = Inbox,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-56 flex-col items-center justify-center px-6 py-12 text-center',
        className
      )}
    >
      <Icon className="size-8 text-slate-300" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-slate-600">{message}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
