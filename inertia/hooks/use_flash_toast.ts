import { usePage } from '@inertiajs/react'
import { useEffect } from 'react'
import { toast } from 'sonner'

import type { AppFlashData } from '~/types'

type FlashLevel = keyof AppFlashData

const TOASTERS: Record<FlashLevel, (message: string) => void> = {
  success: (message) => toast.success(message),
  error: (message) => toast.error(message),
  warning: (message) => toast.warning(message),
  info: (message) => toast.info(message),
}

/**
 * Turns the server's flash bag into a toast. Mounted once by the layouts, so a
 * controller that calls `session.flash('success', …)` gets feedback on screen
 * without every page re-implementing its own alert strip.
 *
 * `page.url` is part of the dependency list on purpose: two consecutive visits
 * can flash the exact same message, and without it the second one would be
 * swallowed as an unchanged effect input.
 */
export function useFlashToast() {
  const page = usePage()
  const flash = page.flash as AppFlashData | undefined

  useEffect(() => {
    if (!flash) return

    for (const [level, notify] of Object.entries(TOASTERS) as Array<
      [FlashLevel, (message: string) => void]
    >) {
      const message = flash[level]
      if (message) notify(message)
    }
  }, [flash, page.url])
}
