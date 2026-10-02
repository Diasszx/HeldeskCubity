import { LayoutDashboard, Ticket } from 'lucide-react'
import { NavLink } from 'react-router'
import { tv } from 'tailwind-variants'

const navigation = tv({
  slots: {
    root: 'mt-6 gap-2',
    link: 'flex min-h-11 items-center gap-3 rounded-md border-l-2 border-transparent px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
  },
  variants: {
    open: { true: { root: 'grid' }, false: { root: 'hidden md:grid' } },
    active: {
      true: { link: 'border-primary bg-accent text-accent-foreground' },
    },
  },
  defaultVariants: { open: false, active: false },
})

export function Navigation({
  open,
  onNavigate,
}: {
  open: boolean
  onNavigate: () => void
}) {
  const { root, link } = navigation({ open })
  return (
    <nav
      id="main-navigation"
      aria-label="Navegação principal"
      className={root()}
    >
      <NavLink
        to="/dashboard"
        onClick={onNavigate}
        className={({ isActive }) => link({ active: isActive })}
      >
        <LayoutDashboard className="size-5" aria-hidden="true" />
        Dashboard
      </NavLink>
      <NavLink
        to="/requests"
        onClick={onNavigate}
        className={({ isActive }) => link({ active: isActive })}
      >
        <Ticket className="size-5" aria-hidden="true" />
        Solicitações
      </NavLink>
    </nav>
  )
}
