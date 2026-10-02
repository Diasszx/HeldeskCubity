import { LifeBuoy } from 'lucide-react'
import { Link } from 'react-router'

export function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      to="/dashboard"
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-md text-xl font-bold"
    >
      <LifeBuoy className="size-7 text-primary" aria-hidden="true" />
      <span>
        Cubity
        <span className="block text-[10px] font-medium tracking-[0.2em] text-muted-foreground">
          SUPPORT
        </span>
      </span>
    </Link>
  )
}
