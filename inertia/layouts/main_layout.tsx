import { usePage } from '@inertiajs/react'
import { type ReactNode, useState } from 'react'
import { FloatingChat } from '~/components/chat/floating_chat'
import { CommandPalette } from '~/components/shared/command_palette'
import { useFlashToast } from '~/hooks/use_flash_toast'
import { useShellRealtime } from '~/hooks/use_shell_realtime'
import { Header } from './main/components/header'
import { Sidebar } from './main/components/sidebar'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  useShellRealtime()
  useFlashToast()
  const [collapsed, setCollapsed] = useState(false)
  const { url } = usePage()
  const isChatPage = (url.split('?', 1)[0] ?? '').startsWith('/chat')

  return (
    <div className="flex h-screen overflow-hidden bg-yol-page">
      <Sidebar isCollapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div
            className={isChatPage ? 'h-full w-full' : 'mx-auto w-full max-w-[1440px] p-4 sm:p-6'}
          >
            {children}
          </div>
        </main>
      </div>

      <CommandPalette />

      {!isChatPage && <FloatingChat />}
    </div>
  )
}
