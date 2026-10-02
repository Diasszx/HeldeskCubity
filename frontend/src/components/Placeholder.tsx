import type { ReactNode } from 'react'
import { Construction } from 'lucide-react'
import { Card, CardContent, CardTitle, CardDescription } from './ui/card'

export function Placeholder({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Card asChild>
      <section>
        <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <span className="mb-1 grid size-12 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Construction className="size-6" aria-hidden="true" />
          </span>
          <CardTitle asChild>
            <h2>{title}</h2>
          </CardTitle>
          <CardDescription asChild>
            <p className="max-w-lg wrap-anywhere">{children}</p>
          </CardDescription>
        </CardContent>
      </section>
    </Card>
  )
}
