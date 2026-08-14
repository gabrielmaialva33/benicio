import type { ReactNode } from 'react'

import { useFlashToast } from '~/hooks/use_flash_toast'

interface AuthSplitLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthSplitLayout({ title, subtitle, children, footer }: AuthSplitLayoutProps) {
  useFlashToast()

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#373737]">
      <div className="absolute -left-80 top-60 hidden size-[1136px] rounded-full border-[15px] border-orange-500/50 shadow-[0_4px_94.6px_13px_#0F172A] md:block" />
      <div className="absolute -left-80 top-[-314px] hidden size-[1136px] rounded-full border-[15px] border-orange-500/50 shadow-[0_4px_94.6px_13px_#0F172A] md:block" />

      <main className="relative z-10 mx-auto flex h-full w-full max-w-[1280px] items-center justify-center px-4 md:justify-between">
        <div className="hidden flex-col items-start justify-center md:flex">
          <img
            src="/yol/logo-yol.svg"
            alt="Benício Advogados"
            width={406}
            height={120}
            className="h-auto w-full max-w-[406px]"
          />
        </div>

        <section className="flex w-full max-w-[490px] shrink-0 flex-col items-center justify-center gap-10 rounded-[15px] bg-white px-[32.5px] py-12 shadow-lg md:min-h-[607px] md:py-16">
          <header className="text-center">
            <h1 className="font-semibold text-[40px] leading-[0.8] tracking-[-0.01em] text-gray-900">
              {title}
            </h1>
            {subtitle && <p className="mt-4 text-sm text-gray-500">{subtitle}</p>}
          </header>

          <div className="w-full">{children}</div>
          {footer && <div className="text-center text-sm text-gray-500">{footer}</div>}
        </section>
      </main>
    </div>
  )
}
