import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '~/hooks/use_auth'
import {
  getFavoriteFolders,
  getMessageFeed,
  getNotificationFeed,
  markAllMessagesRead,
  markAllNotificationsRead,
  markMessageRead,
  markNotificationRead,
} from '~/services/shell_data'

const refreshInterval = 60_000

function feedKey(kind: 'notifications' | 'messages', tenantId: number | null) {
  return ['shell', kind, tenantId] as const
}

export function useNotificationFeed() {
  const { activeTenantId } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = feedKey('notifications', activeTenantId)
  const query = useQuery({
    queryKey,
    queryFn: () => getNotificationFeed(),
    enabled: activeTenantId !== null,
    refetchInterval: refreshInterval,
  })
  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })
  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return { ...query, markRead, markAllRead, hasTenant: activeTenantId !== null }
}

export function useMessageFeed() {
  const { activeTenantId } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = feedKey('messages', activeTenantId)
  const query = useQuery({
    queryKey,
    queryFn: () => getMessageFeed(),
    enabled: activeTenantId !== null,
    refetchInterval: refreshInterval,
  })
  const markRead = useMutation({
    mutationFn: markMessageRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })
  const markAllRead = useMutation({
    mutationFn: markAllMessagesRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return { ...query, markRead, markAllRead, hasTenant: activeTenantId !== null }
}

export function useFavoriteFolders() {
  const { activeTenantId } = useAuth()

  return useQuery({
    queryKey: ['shell', 'favorite-folders', activeTenantId],
    queryFn: getFavoriteFolders,
    enabled: activeTenantId !== null,
  })
}
