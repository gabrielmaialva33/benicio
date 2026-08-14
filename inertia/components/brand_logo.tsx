import { Scale } from 'lucide-react'

import { cn } from '~/lib/utils'

interface BrandLogoProps {
  collapsed?: boolean
  inverse?: boolean
  className?: string
}

export function BrandLogo({ collapsed = false, inverse = false, className }: BrandLogoProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f97316] shadow-[0_8px_24px_rgba(249,115,22,0.28)]">
        <Scale className="size-5 text-white" strokeWidth={2.25} />
      </span>

      {!collapsed && (
        <span className="min-w-0 leading-none">
          <span
            className={cn(
              'block text-[1.35rem] font-black tracking-[-0.05em]',
              inverse ? 'text-white' : 'text-[#161c24]'
            )}
          >
            YOL <span className="text-[#f97316]">BENÍCIO</span>
          </span>
          <span
            className={cn(
              'mt-1 block text-[0.58rem] font-semibold uppercase tracking-[0.24em]',
              inverse ? 'text-white/45' : 'text-slate-500'
            )}
          >
            Gestão jurídica
          </span>
        </span>
      )}
    </div>
  )
}
