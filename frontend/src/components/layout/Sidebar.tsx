import type { Ref } from 'react'
import { Brand } from './Brand'
import { MenuToggle } from './MenuToggle'
import { Navigation } from './Navigation'

export function Sidebar({
  open,
  onToggle,
  onNavigate,
  menuRef,
}: {
  open: boolean
  onToggle: () => void
  onNavigate: () => void
  menuRef: Ref<HTMLButtonElement>
}) {
  return (
    <aside className="flex flex-col border-b bg-card p-4 text-card-foreground md:min-h-dvh md:border-r md:border-b-0 md:px-5 md:py-7">
      <div className="flex items-center justify-between gap-3">
        <Brand onNavigate={onNavigate} />
        <MenuToggle ref={menuRef} open={open} onToggle={onToggle} />
      </div>
      <Navigation open={open} onNavigate={onNavigate} />
      <p className="mt-auto hidden pt-8 text-xs text-muted-foreground md:block">
        Portal de Solicitações Internas
      </p>
    </aside>
  )
}
