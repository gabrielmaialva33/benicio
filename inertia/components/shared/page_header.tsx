import type { ReactNode } from 'react'

import { cn } from '~/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

/**
 * Standard page header used across all authenticated pages. Keeps the title,
 * description and actions visually identical (typography, spacing, alignment)
 * regardless of which page renders it.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-[0_4px_4px_rgba(0,0,0,0.03)] sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-yol-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export default PageHeader
