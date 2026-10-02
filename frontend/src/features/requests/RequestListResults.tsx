import { LoaderCircle, SearchX, CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RequestListRow } from './request-list'
import { RequestsTable } from './RequestsTable'

export function RequestListResults({
  rows,
  phase,
  error,
  onRetry,
}: {
  rows: RequestListRow[]
  phase: 'loading' | 'ready' | 'error'
  error: string | null
  onRetry: () => void
}) {
  return (
    <Card asChild>
      <section aria-labelledby="results-title" aria-busy={phase === 'loading'}>
        <CardHeader>
          <CardTitle asChild>
            <h2 id="results-title">Solicitações encontradas</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {phase === 'loading' && (
            <div
              role="status"
              className="flex min-h-40 items-center justify-center gap-3 text-muted-foreground"
            >
              <LoaderCircle
                className="size-5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Carregando solicitações…
            </div>
          )}
          {phase === 'error' && (
            <div
              role="alert"
              className="flex min-h-40 flex-col items-center justify-center gap-4 text-center"
            >
              <CircleAlert
                className="size-6 text-destructive"
                aria-hidden="true"
              />
              <p>{error}</p>
              <Button type="button" variant="outline" onClick={onRetry}>
                Tentar novamente
              </Button>
            </div>
          )}
          {phase === 'ready' && (
            <>
              <p role="status" className="mb-4 text-sm text-muted-foreground">
                {rows.length}{' '}
                {rows.length === 1
                  ? 'solicitação encontrada'
                  : 'solicitações encontradas'}
              </p>
              {rows.length > 0 ? (
                <RequestsTable rows={rows} />
              ) : (
                <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                  <SearchX className="size-6" aria-hidden="true" />
                  <p>
                    Nenhuma solicitação encontrada. Ajuste ou limpe os filtros.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </section>
    </Card>
  )
}
