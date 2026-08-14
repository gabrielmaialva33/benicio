import { Link } from '@inertiajs/react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

interface ActionButtonProps {
  icon: LucideIcon
  /** Doubles as the accessible name and as the tooltip copy. */
  label: string
  href?: string
  onClick?: () => void
  disabled?: boolean
}

/**
 * Icon-only row action. It exists mostly to stop icon buttons from shipping
 * without an accessible name — a screen reader announcing "button" for every
 * row is the failure mode this replaces.
 */
export function ActionButton({ icon: Icon, label, href, onClick, disabled }: ActionButtonProps) {
  const button = (
    <Button
      variant="ghost"
      mode="icon"
      size="sm"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      asChild={!!href}
    >
      {href ? (
        <Link href={href}>
          <Icon className="size-4" />
        </Link>
      ) : (
        <Icon className="size-4" />
      )}
    </Button>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
