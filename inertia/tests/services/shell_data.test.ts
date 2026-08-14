import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getFavoriteFolders,
  getMessageFeed,
  getNotificationFeed,
  markAllMessagesRead,
  markNotificationRead,
  ShellDataError,
} from '~/services/shell_data'

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('shell data service', () => {
  it('loads recent notifications and the authoritative unread count', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/recent')) {
        return jsonResponse({
          data: [
            {
              id: 7,
              type: 'deadline',
              title: 'Prazo amanhã',
              message: 'Revise a contestação.',
              read_at: null,
              action_url: '/folders/3',
              action_text: 'Abrir pasta',
              created_at: '2026-08-14T10:00:00.000Z',
              actor: { id: 2, full_name: 'Ana Lima' },
            },
          ],
        })
      }
      return jsonResponse({ data: { count: 4 } })
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(getNotificationFeed()).resolves.toMatchObject({
      unreadCount: 4,
      items: [{ id: 7, title: 'Prazo amanhã' }],
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/notifications/recent?limit=5',
      expect.objectContaining({ credentials: 'same-origin' })
    )
  })

  it('loads messages and favorite folders from their real API contracts', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/messages/recent')) {
        return jsonResponse({
          data: [
            {
              id: 9,
              subject: 'Peça revisada',
              body: 'A versão final está pronta.',
              priority: 'normal',
              read_at: null,
              created_at: '2026-08-14T10:00:00.000Z',
              sender: { id: 3, full_name: 'Bruno Reis' },
            },
          ],
        })
      }
      if (url.includes('/messages/unread-count')) return jsonResponse({ data: { count: 1 } })
      return jsonResponse({
        data: [
          {
            id: 3,
            code: 'CIV-003',
            title: 'Ação indenizatória',
            area: 'Cível',
            processes_count: 2,
          },
        ],
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(getMessageFeed()).resolves.toMatchObject({
      unreadCount: 1,
      items: [{ id: 9, subject: 'Peça revisada' }],
    })
    await expect(getFavoriteFolders()).resolves.toEqual([
      { id: 3, code: 'CIV-003', title: 'Ação indenizatória', area: 'Cível', processes_count: 2 },
    ])
  })

  it('uses the API mutation methods and fails loudly on an invalid contract', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/notifications/7/read')) {
        return jsonResponse({
          data: {
            id: 7,
            type: 'info',
            title: 'Lida',
            message: 'Notificação lida.',
            read_at: '2026-08-14T11:00:00.000Z',
            action_url: null,
            action_text: null,
            created_at: '2026-08-14T10:00:00.000Z',
          },
        })
      }
      if (url.endsWith('/messages/read-all')) return jsonResponse({ data: { updated: 2 } })
      return jsonResponse({ data: [{ id: 'wrong-type' }] })
    })
    vi.stubGlobal('fetch', fetchMock)

    await markNotificationRead(7)
    await markAllMessagesRead()
    await expect(getFavoriteFolders()).rejects.toBeInstanceOf(ShellDataError)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/notifications/7/read',
      expect.objectContaining({ method: 'PUT' })
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/messages/read-all',
      expect.objectContaining({ method: 'PUT' })
    )
  })
})
