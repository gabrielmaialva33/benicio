import { z } from 'zod'

import type { ShellFavoriteFolder, ShellFeed, ShellMessage, ShellNotification } from '~/types/shell'

const personSchema = z.object({
  id: z.number(),
  full_name: z.string(),
})

const notificationSchema = z.object({
  id: z.number(),
  type: z.enum([
    'info',
    'success',
    'warning',
    'error',
    'task',
    'hearing',
    'deadline',
    'message',
    'system',
  ]),
  title: z.string(),
  message: z.string(),
  read_at: z.string().nullable(),
  action_url: z.string().nullable(),
  action_text: z.string().nullable(),
  created_at: z.string(),
  actor: personSchema.nullable().optional(),
})

const messageSchema = z.object({
  id: z.number(),
  subject: z.string(),
  body: z.string(),
  priority: z.enum(['low', 'normal', 'high']),
  read_at: z.string().nullable(),
  created_at: z.string(),
  sender: personSchema.nullable().optional(),
})

const favoriteFolderSchema = z.object({
  id: z.number(),
  code: z.string(),
  title: z.string(),
  area: z.string(),
  processes_count: z.number().nonnegative(),
})

const unreadCountSchema = z.object({
  data: z.object({ count: z.number().nonnegative() }),
})

const notificationsSchema = z.object({ data: z.array(notificationSchema) })
const messagesSchema = z.object({ data: z.array(messageSchema) })
const favoriteFoldersSchema = z.object({ data: z.array(favoriteFolderSchema) })

export class ShellDataError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'ShellDataError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function errorMessage(payload: unknown, fallback: string) {
  if (!isRecord(payload)) return fallback
  if (typeof payload.message === 'string') return payload.message
  if (isRecord(payload.error) && typeof payload.error.message === 'string') {
    return payload.error.message
  }
  if (Array.isArray(payload.errors)) {
    const first = payload.errors[0]
    if (isRecord(first) && typeof first.message === 'string') return first.message
  }
  return fallback
}

async function requestJson<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  init?: RequestInit
): Promise<z.output<TSchema>> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  })

  let payload: unknown = null
  try {
    payload = (await response.json()) as unknown
  } catch {
    // An empty or malformed response is reported with request context below.
  }

  if (!response.ok) {
    throw new ShellDataError(errorMessage(payload, `Falha ao consultar ${path}.`), response.status)
  }

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    throw new ShellDataError(`Resposta inválida recebida de ${path}.`, response.status)
  }

  return parsed.data
}

export async function getNotificationFeed(limit = 5): Promise<ShellFeed<ShellNotification>> {
  const [recent, unread] = await Promise.all([
    requestJson(`/api/v1/notifications/recent?limit=${limit}`, notificationsSchema),
    requestJson('/api/v1/notifications/unread-count', unreadCountSchema),
  ])

  return { items: recent.data, unreadCount: unread.data.count }
}

export async function getMessageFeed(limit = 5): Promise<ShellFeed<ShellMessage>> {
  const [recent, unread] = await Promise.all([
    requestJson(`/api/v1/messages/recent?limit=${limit}`, messagesSchema),
    requestJson('/api/v1/messages/unread-count', unreadCountSchema),
  ])

  return { items: recent.data, unreadCount: unread.data.count }
}

export async function getFavoriteFolders(): Promise<ShellFavoriteFolder[]> {
  const response = await requestJson('/api/v1/me/favorites/folders', favoriteFoldersSchema)
  return response.data
}

export async function markNotificationRead(id: number): Promise<void> {
  await requestJson(`/api/v1/notifications/${id}/read`, z.object({ data: notificationSchema }), {
    method: 'PUT',
  })
}

export async function markAllNotificationsRead(): Promise<void> {
  await requestJson(
    '/api/v1/notifications/read-all',
    z.object({ data: z.object({ updated: z.number().nonnegative() }) }),
    { method: 'PUT' }
  )
}

export async function markMessageRead(id: number): Promise<void> {
  await requestJson(`/api/v1/messages/${id}/read`, z.object({ data: messageSchema }), {
    method: 'PUT',
  })
}

export async function markAllMessagesRead(): Promise<void> {
  await requestJson(
    '/api/v1/messages/read-all',
    z.object({ data: z.object({ updated: z.number().nonnegative() }) }),
    { method: 'PUT' }
  )
}
