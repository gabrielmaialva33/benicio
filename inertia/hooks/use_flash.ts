import { usePage } from '@inertiajs/react'

import type { AppFlashData } from '~/types'

/** Returns Inertia v3's first-class, ephemeral page flash bag. */
export function useFlash(): AppFlashData {
  return usePage().flash as AppFlashData
}
