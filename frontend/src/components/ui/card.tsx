import type { ComponentProps } from 'react'
import { Slot } from 'radix-ui'
import { tv, type VariantProps } from 'tailwind-variants'
import { cn } from '@/lib/utils'

// shadcn/ui new-york Card, with coordinated density variants.
const cardVariants = tv({
  slots: {
    root: 'flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm',
  },
  variants: {
    density: {
      default: { root: 'gap-6 py-6' },
      compact: { root: 'gap-4 py-4' },
    },
  },
  defaultVariants: { density: 'default' },
})

export function Card({
  className,
  density,
  asChild = false,
  ...props
}: ComponentProps<'div'> &
  VariantProps<typeof cardVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div'
  return (
    <Comp
      data-slot="card"
      className={cardVariants({ density }).root({ className })}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('grid auto-rows-min items-start gap-2 px-6', className)}
      {...props}
    />
  )
}

export function CardTitle({
  className,
  asChild = false,
  ...props
}: ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div'
  return (
    <Comp
      data-slot="card-title"
      className={cn('text-lg font-semibold leading-tight', className)}
      {...props}
    />
  )
}

export function CardDescription({
  className,
  asChild = false,
  ...props
}: ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div'
  return (
    <Comp
      data-slot="card-description"
      className={cn('text-sm leading-7 text-muted-foreground', className)}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-6', className)}
      {...props}
    />
  )
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-6', className)}
      {...props}
    />
  )
}
