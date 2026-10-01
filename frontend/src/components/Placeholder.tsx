import type { ReactNode } from 'react'
import { Construction } from 'lucide-react'

export function Placeholder({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="panel placeholder">
      <span className="placeholder-icon">
        <Construction size={24} aria-hidden="true" />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  )
}
