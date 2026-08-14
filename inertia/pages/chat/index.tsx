import { Head } from '@inertiajs/react'

import { ChatShell } from '~/components/chat/chat_shell'
import { useFlash } from '~/hooks/use_flash'
import { MainLayout } from '~/layouts'
import type { AiConversation } from '~/types/ai'

interface ChatPageProps {
  conversations: AiConversation[]
  conversation: AiConversation | null
  ai_available: boolean
}

export default function ChatPage(props: ChatPageProps) {
  const flash = useFlash()

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
