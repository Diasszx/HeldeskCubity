import { Link, useNavigate, useParams } from 'react-router'
import type { PortalServices } from '@/contracts/portal'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { useRequestDetails } from './useRequestDetails'
import { RequestDetailsCard } from './RequestDetailsCard'
import { RequestActions } from './RequestActions'

export function RequestDetailsPage({
  services,
}: {
  services?: PortalServices
}) {
  const { id } = useParams()
  return <RequestDetailsContent key={id} id={id ?? ''} services={services} />
}

function RequestDetailsContent({
  id,
  services,
}: {
  id: string
  services?: PortalServices
}) {
  const details = useRequestDetails(id, services)
  const navigate = useNavigate()
  return (
    <>
      <SectionHeader>
        <Button variant="link" asChild className="px-0">
          <Link to="/requests">← Voltar para solicitações</Link>
        </Button>
      </SectionHeader>
      {details.state.phase === 'loading' && (
        <p role="status">Carregando solicitação…</p>
      )}
      {details.state.phase === 'error' && (
        <div className="grid gap-4">
          <p role="alert">
            {details.state.error.code === 'NOT_FOUND'
              ? 'Solicitação não encontrada. Ela pode ter sido removida.'
              : details.state.error.message}
          </p>
          <Button variant="outline" onClick={details.reload}>
            Tentar novamente
          </Button>
        </div>
      )}
      {details.state.phase === 'ready' && (
        <div className="grid min-w-0 grid-cols-1 gap-6">
          {details.success && <p role="status">{details.success}</p>}
          {details.error && (
            <div className="grid gap-3">
              <p role="alert" className="text-sm text-destructive">
                {details.error.message}
              </p>
              {details.blocked && (
                <p className="text-sm text-muted-foreground">
                  As ações foram bloqueadas. Atualize os detalhes antes de
                  tentar novamente.
                </p>
              )}
              <Button
                variant="outline"
                disabled={details.pending}
                onClick={details.reload}
              >
                Atualizar detalhes
              </Button>
            </div>
          )}
          <RequestDetailsCard data={details.state.data} />
          <RequestActions
            data={details.state.data}
            pending={details.pending}
            blocked={details.blocked}
            error={details.error?.message}
            onAdvance={details.advance}
            onRemove={async () => {
              const removed = await details.remove()
              if (removed)
                void navigate('/requests', {
                  state: {
                    requestSuccess: `Solicitação ${details.state.phase === 'ready' ? details.state.data.request.code : ''} excluída com sucesso.`,
                  },
                })
              return removed
            }}
          />
        </div>
      )}
    </>
  )
}
