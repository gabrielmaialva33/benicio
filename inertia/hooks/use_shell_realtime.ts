import { Transmit } from '@adonisjs/transmit-client'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAuth } from '~/hooks/use_auth'

export function useShellRealtime() {
  const { user, activeTenantId } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? null

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('EventSource' in window) ||
      activeTenantId === null ||
      userId === null
    ) {
      return
    }

    const transmit = new Transmit({
      baseUrl: window.location.origin,
      uidGenerator: () =>
        window.crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    })
    const notificationChannel = transmit.subscription(
      `tenants/${activeTenantId}/users/${userId}/notifications`
    )
    const messageChannel = transmit.subscription(
      `tenants/${activeTenantId}/users/${userId}/messages`
    )

    const removeNotificationHandler = notificationChannel.onMessage(() => {
      void queryClient.invalidateQueries({
        queryKey: ['shell', 'notifications', activeTenantId],
      })
    })
    const removeMessageHandler = messageChannel.onMessage(() => {
      void queryClient.invalidateQueries({
        queryKey: ['shell', 'messages', activeTenantId],
      })
    })

    void Promise.all([notificationChannel.create(), messageChannel.create()])

    return () => {
      removeNotificationHandler()
      removeMessageHandler()
      void Promise.all([notificationChannel.delete(), messageChannel.delete()])
      transmit.close()
    }
  }, [activeTenantId, queryClient, userId])
}
