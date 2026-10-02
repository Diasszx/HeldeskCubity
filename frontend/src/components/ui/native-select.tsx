import type { ComponentProps } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { tv, type VariantProps } from 'tailwind-variants'
import { cn } from '@/lib/utils'

// shadcn/ui NativeSelect: sizes coordinated through tv slots.
const selectVariants = tv({
  slots: {
    root: 'relative w-full min-w-0 has-[select:disabled]:opacity-50',
    control:
      'w-full min-w-0 appearance-none rounded-md border border-input bg-card px-3 pr-9 text-base shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed aria-invalid:border-destructive md:text-sm',
    icon: 'pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground',
  },
  variants: {
    size: { default: { control: 'h-11 py-2' }, sm: { control: 'h-9 py-1' } },
  },
  defaultVariants: { size: 'default' },
})

export function NativeSelect({
  className,
  size,
  ...props
}: Omit<ComponentProps<'select'>, 'size'> &
  VariantProps<typeof selectVariants>) {
  const { root, control, icon } = selectVariants({ size })
  return (
    <div data-slot="native-select-wrapper" className={root()}>
      <select
        data-slot="native-select"
        className={control({ className })}
        {...props}
      />
      <ChevronDownIcon className={icon()} aria-hidden="true" />
    </div>
  )
}

export function NativeSelectOption({
  className,
  ...props
}: ComponentProps<'option'>) {
  return (
    <option
      data-slot="native-select-option"
      className={cn('bg-card text-card-foreground', className)}
      {...props}
    />
  )
}
