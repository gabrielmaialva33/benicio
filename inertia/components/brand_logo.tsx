import { cn } from '~/lib/utils'

interface BrandLogoProps {
  collapsed?: boolean
  inverse?: boolean
  className?: string
}

export function BrandLogo({ collapsed = false, className }: BrandLogoProps) {
  return (
    <img
      src={collapsed ? '/yol/icons/logo.svg' : '/yol/logo-yol.svg'}
      alt="Benício Advogados"
      width={collapsed ? 42 : 159}
      height={collapsed ? 35 : 60}
      className={cn(collapsed ? 'h-[35px] w-[42px]' : 'h-auto w-[159px]', className)}
    />
  )
}
