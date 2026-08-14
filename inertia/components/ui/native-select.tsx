import { ChevronDown } from 'lucide-react'
import { type ComponentPropsWithoutRef, forwardRef } from 'react'

import { cn } from '~/lib/utils'

/**
 * A plain `<select>` wearing the same skin as `Input`.
 *
 * The forms already use native selects — they submit without JavaScript and
 * keep the mobile picker — but each screen had hand-rolled its own border,
 * height and focus ring, so the controls drifted apart and none matched the
 * text inputs next to them. This keeps the native element and only fixes the
 * appearance.
 *
 * `appearance-none` drops the platform arrow so the chevron below can sit at a
 * predictable spot; the padding leaves room for it.
 */
const sizeVariants = {
  lg: 'h-12 rounded-lg pl-4 pr-10 text-sm',
  md: 'h-11 rounded-lg pl-4 pr-10 text-sm',
  sm: 'h-9 rounded-lg pl-3 pr-9 text-xs',
  xs: 'h-8 rounded-md pl-2.5 pr-8 text-xs',
} as const

export type NativeSelectSize = keyof typeof sizeVariants

export type NativeSelectProps = ComponentPropsWithoutRef<'select'> & {
  selectSize?: NativeSelectSize
  containerClassName?: string
}

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(function NativeSelect(
  { className, containerClassName, selectSize = 'md', children, ...selectProps },
  ref
) {
  return (
    <div className={cn('relative w-full', containerClassName)}>
      <select
        {...selectProps}
        ref={ref}
        className={cn(
          'w-full appearance-none border border-border bg-white text-yol-ink transition-[color,box-shadow]',
          'focus-visible:border-yol-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100',
          'disabled:cursor-not-allowed disabled:opacity-60',
          'aria-invalid:border-destructive/60 aria-invalid:ring-destructive/10',
          sizeVariants[selectSize],
          className
        )}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400',
          selectSize === 'xs' ? 'right-2 size-3.5' : 'right-3 size-4'
        )}
      />
    </div>
  )
})
