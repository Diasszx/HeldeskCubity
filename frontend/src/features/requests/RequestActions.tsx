import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { availableRequestActions, type RequestDetails } from './request-details'
import { DeleteRequestDialog } from './DeleteRequestDialog'

export function RequestActions({
  data,
  pending,
  blocked,
  error,
  onAdvance,
  onRemove,
}: {
  data: RequestDetails
  pending: boolean
  blocked: boolean
  error?: string
  onAdvance: () => Promise<boolean>
  onRemove: () => Promise<boolean>
}) {
  const actions = availableRequestActions(data.request, data.currentUser)
  return (
    <Card asChild density="compact">
      <section aria-labelledby="actions-title" aria-busy={pending}>
        <CardHeader>
          <CardTitle asChild>
            <h2 id="actions-title">Ações da solicitação</h2>
          </CardTitle>
          <CardDescription>
            O atendimento avança de Aberto para Em Atendimento e depois
            Concluído. Apenas o solicitante pode editar ou excluir enquanto
            estiver aberta.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {actions.nextStatus && (
            <Button
              disabled={pending || blocked}
              onClick={() => {
                void onAdvance()
              }}
            >
              {pending
                ? 'Aguarde…'
                : actions.nextStatus === 'IN_PROGRESS'
                  ? 'Iniciar atendimento'
                  : 'Concluir atendimento'}
            </Button>
          )}
          {actions.editable && !pending && !blocked && (
            <Button variant="outline" asChild>
              <Link to={`/requests/${data.request.id}/edit`}>
                Editar solicitação
              </Link>
            </Button>
          )}
          {actions.removable && (
            <DeleteRequestDialog
              code={data.request.code}
              pending={pending}
              disabled={blocked}
              error={error}
              onConfirm={onRemove}
            />
          )}
          {!actions.nextStatus && (
            <p className="text-sm text-muted-foreground">
              Solicitação concluída. Não há novas ações disponíveis.
            </p>
          )}
        </CardContent>
      </section>
    </Card>
  )
}
