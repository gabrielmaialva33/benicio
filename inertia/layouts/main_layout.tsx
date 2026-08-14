import { usePage } from '@inertiajs/react'
import { useState, type ReactNode } from 'react'
import { FloatingChat } from '~/components/chat/floating_chat'
import { Header } from './main/components/header'
import { Sidebar } from './main/components/sidebar'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { url } = usePage()
  const isChatPage = (url.split('?', 1)[0] ?? '').startsWith('/chat')

  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f1f2]">
      <Sidebar isCollapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className={isChatPage ? 'h-full w-full' : 'w-full p-4 sm:p-6'}>{children}</div>
        </main>
      </div>

      {!isChatPage && <FloatingChat />}
    </div>
  )
}
