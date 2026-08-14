import type { VariantProps } from 'class-variance-authority'
import type { ReactNode } from 'react'

import { Badge, type BadgeProps, badgeVariants } from '~/components/ui/badge'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>
type BadgeAppearance = NonNullable<VariantProps<typeof badgeVariants>['appearance']>

interface StatusTone {
  variant: BadgeVariant
  appearance?: BadgeAppearance
}

/**
 * Semantic tone per domain status, in one place. Anything not listed falls back
 * to `secondary`, so a new status from the API shows up grey instead of
 * crashing or borrowing an unrelated colour.
 */
const STATUS_TONES: Record<string, StatusTone> = {
  // Folders and processes
  active: { variant: 'success', appearance: 'light' },
  suspended: { variant: 'warning', appearance: 'light' },
  archived: { variant: 'secondary', appearance: 'light' },
  closed: { variant: 'info', appearance: 'light' },
  completed: { variant: 'success', appearance: 'light' },
  cancelled: { variant: 'secondary', appearance: 'outline' },
  pending: { variant: 'warning', appearance: 'light' },
  in_progress: { variant: 'primary', appearance: 'light' },

  // Deadlines and tasks
  overdue: { variant: 'destructive', appearance: 'light' },
  fatal: { variant: 'destructive' },
  scheduled: { variant: 'info', appearance: 'light' },

  // Priorities
  urgent: { variant: 'destructive' },
  high: { variant: 'destructive', appearance: 'light' },
  medium: { variant: 'warning', appearance: 'light' },
  low: { variant: 'secondary', appearance: 'light' },

  // Clients
  individual: { variant: 'info', appearance: 'light' },
  company: { variant: 'primary', appearance: 'light' },
}

interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'appearance'> {
  status: string
  /** Dictionary from `~/lib/labels`; the raw key shows through when unmapped. */
  labels?: Record<string, string>
  /** Overrides the label — use it to prefix an icon, not to retype the copy. */
  children?: ReactNode
}

export function StatusBadge({ status, labels, size = 'md', children, ...props }: StatusBadgeProps) {
  const tone = STATUS_TONES[status] ?? { variant: 'secondary' as BadgeVariant }

  return (
    <Badge variant={tone.variant} appearance={tone.appearance} size={size} {...props}>
      {children ?? labels?.[status] ?? status}
    </Badge>
  )
}
