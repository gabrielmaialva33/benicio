import { Building2, UserRound } from 'lucide-react'

import { cn } from '~/lib/utils'
import type { ClientPersonType } from '~/types/client'

export function ClientPersonBadge({
  personType,
  className,
}: {
  personType: ClientPersonType
  className?: string
}) {
  const company = personType === 'company'
  const Icon = company ? Building2 : UserRound

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
        company
          ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300'
          : 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
        className
      )}
    >
      <Icon className="size-3.5" />
      {company ? 'Pessoa jurídica' : 'Pessoa física'}
    </span>
  )
}
