import { router } from '@inertiajs/react'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HeaderActivity } from '~/components/shell/header_activity'
import { render } from '~/tests/test_utils'

const markNotification = vi.fn()
const markAllNotifications = vi.fn()
const markMessage = vi.fn()
const markAllMessages = vi.fn()

vi.mock('~/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('~/hooks/use_shell_data', () => ({
  useNotificationFeed: () => ({
    data: {
      unreadCount: 2,
      items: [
        {
          id: 1,
          type: 'deadline',
          title: 'Prazo amanhã',
          message: 'Revise a contestação.',
          read_at: null,
          action_url: '/folders/3',
          action_text: 'Abrir pasta',
          created_at: new Date().toISOString(),
          actor: { id: 2, full_name: 'Ana Lima' },
        },
      ],
    },
    hasTenant: true,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    markRead: { mutate: markNotification },
    markAllRead: { mutate: markAllNotifications, isPending: false },
  }),
  useMessageFeed: () => ({
    data: {
      unreadCount: 1,
      items: [
        {
          id: 4,
          subject: 'Peça revisada',
          body: 'A versão final está pronta.',
          priority: 'normal',
          read_at: null,
          created_at: new Date().toISOString(),
          sender: { id: 3, full_name: 'Bruno Reis' },
        },
      ],
    },
    hasTenant: true,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    markRead: { mutate: markMessage },
    markAllRead: { mutate: markAllMessages, isPending: false },
  }),
}))

describe('HeaderActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders real notification and message feeds with unread counters', async () => {
    const { user } = render(<HeaderActivity />)

    expect(screen.getByRole('button', { name: 'Notificações, 2 não lidas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mensagens, 1 não lidas' })).toBeInTheDocument()
    expect(screen.getByText('Prazo amanhã')).toBeInTheDocument()
    expect(screen.getByText('Peça revisada')).toBeInTheDocument()

    await user.click(screen.getByText('Prazo amanhã'))
    expect(markNotification).toHaveBeenCalledWith(1, expect.any(Object))
    const mutationOptions = markNotification.mock.calls[0]?.[1] as { onSettled?: () => void }
    mutationOptions.onSettled?.()
    expect(router.visit).toHaveBeenCalledWith('/folders/3')

    await user.click(screen.getByText('Peça revisada'))
    expect(markMessage).toHaveBeenCalledWith(4)
  })
})
