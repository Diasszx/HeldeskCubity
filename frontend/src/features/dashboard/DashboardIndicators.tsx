import { Button } from '@/components/ui/button'
import { IndicatorCard } from './IndicatorCard'
import type { useIndicators } from './useIndicators'

export function DashboardIndicators({
  state,
  retry,
}: ReturnType<typeof useIndicators>) {
  return (
    <section
      aria-labelledby="indicators-title"
      aria-busy={state.phase === 'loading'}
      className="grid gap-4"
    >
      <h2 id="indicators-title" className="text-lg font-semibold">
        Indicadores das solicitações
      </h2>
      <p className="text-sm text-muted-foreground">
        Consideram todas as solicitações, independentemente dos filtros da
        listagem.
      </p>
      {state.phase === 'loading' && (
        <p role="status">Carregando indicadores…</p>
      )}
      {state.phase === 'error' && (
        <div className="grid justify-items-start gap-3">
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
          <Button variant="outline" onClick={retry}>
            Tentar novamente
          </Button>
        </div>
      )}
      {state.phase === 'ready' && (
        <>
          {state.counts.total === 0 && (
            <p role="status" className="text-sm text-muted-foreground">
              Nenhuma solicitação registrada.
            </p>
          )}
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <IndicatorCard
              label="Total de solicitações"
              value={state.counts.total}
            />
            <IndicatorCard
              label="Abertas"
              value={state.counts.open}
              tone="open"
            />
            <IndicatorCard
              label="Em Atendimento"
              value={state.counts.inProgress}
              tone="progress"
            />
            <IndicatorCard
              label="Concluídas"
              value={state.counts.completed}
              tone="completed"
            />
          </div>
        </>
      )}
    </section>
  )
}
