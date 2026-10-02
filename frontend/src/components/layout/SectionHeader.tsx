import type { ReactNode } from 'react'

export function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
      {children}
    </div>
  )
}
