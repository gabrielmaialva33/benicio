import { router } from '@inertiajs/react'
import { ArrowLeft } from 'lucide-react'

import { Button } from '~/components/ui/button'

interface BackButtonProps {
  /** Where to land when there is no history to pop (deep link, new tab). */
  fallbackUrl: string
  label?: string
  className?: string
}

export function BackButton({ fallbackUrl, label = 'Voltar', className }: BackButtonProps) {
  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back()
      return
    }

    router.visit(fallbackUrl)
  }

  return (
    <Button variant="outline" size="sm" onClick={goBack} className={className}>
      <ArrowLeft className="size-4" />
      {label}
    </Button>
  )
}
