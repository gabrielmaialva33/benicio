import { useState, type ReactNode } from 'react'
import { Header } from './main/components/header'
import { Sidebar } from './main/components/sidebar'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#f1f1f2] dark:bg-background">
      <Sidebar isCollapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Header onToggleSidebar={() => setCollapsed((value) => !value)} />

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1480px] p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
