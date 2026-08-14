export const MESSAGE_PRIORITIES = ['low', 'normal', 'high'] as const
export const MESSAGE_BOXES = ['inbox', 'sent', 'all'] as const

export type MessagePriority = (typeof MESSAGE_PRIORITIES)[number]
export type MessageBox = (typeof MESSAGE_BOXES)[number]

export interface MessageListInput {
  page?: number
  per_page?: number
  box?: MessageBox
  unread?: boolean
  priority?: MessagePriority
  search?: string
}

export interface CreateMessageData {
  recipient_id: number
  subject: string
  body: string
  priority?: MessagePriority
  metadata?: Record<string, unknown>
}
