import { Building2, UserRound } from 'lucide-react'

import { StatusBadge } from '~/components/shared/status_badge'
import { CLIENT_PERSON_TYPE_LABELS } from '~/lib/labels'
import type { ClientPersonType } from '~/types/client'

export function ClientPersonBadge({
  personType,
  className,
}: {
  personType: ClientPersonType
  className?: string
}) {
  const Icon = personType === 'company' ? Building2 : UserRound

  return (
    <StatusBadge status={personType} labels={CLIENT_PERSON_TYPE_LABELS} className={className}>
      <Icon />
      {CLIENT_PERSON_TYPE_LABELS[personType]}
    </StatusBadge>
  )
}
