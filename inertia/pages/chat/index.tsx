import { Head, usePage } from '@inertiajs/react'

import { ChatShell } from '~/components/chat/chat_shell'
import { MainLayout } from '~/layouts'
import type { AiConversation } from '~/types/ai'

interface ChatPageProps {
  conversations: AiConversation[]
  conversation: AiConversation | null
  ai_available: boolean
}

interface SharedFlashProps {
  flash?: { success?: string | null; error?: string | null }
}

export default function ChatPage(props: ChatPageProps) {
  const { flash } = usePage().props as SharedFlashProps

  return (
    <MainLayout>
      <Head title={props.conversation?.title ?? 'Assistente IA'} />
      <ChatShell
        conversations={props.conversations}
        conversation={props.conversation}
        aiAvailable={props.ai_available}
        successMessage={flash?.success}
        errorMessage={flash?.error}
      />
    </MainLayout>
  )
}
