import { Link, useNavigate, useParams } from 'react-router'
import type { PortalServices } from '@/contracts/portal'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { RequestForm } from './RequestForm'
import { useRequestForm } from './useRequestForm'
import { editableFields, emptyRequest } from './request-form'

export function RequestFormPage({
  mode,
  services,
}: {
  mode: 'new' | 'edit'
  services?: PortalServices
}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const form = useRequestForm(mode === 'edit' ? id : undefined, services)
  return (
    <>
      <SectionHeader>
        <Button variant="link" asChild className="px-0">
          <Link to="/requests">← Voltar para solicitações</Link>
        </Button>
      </SectionHeader>
      <p className="mb-4 text-sm text-muted-foreground">
        Demonstração com dados simulados. As alterações duram até recarregar a
        página.
      </p>
      {form.state.phase === 'loading' && (
        <p role="status">Carregando formulário…</p>
      )}
      {form.state.phase === 'error' && (
        <div className="grid gap-4">
          <p role="alert">{form.state.error}</p>
          <Button variant="outline" onClick={form.retry}>
            Tentar novamente
          </Button>
        </div>
      )}
      {form.state.phase === 'ready' && (
        <RequestForm
          key={`${mode}-${id ?? 'new'}`}
          categories={form.state.categories}
          editing={mode === 'edit'}
          initialValues={
            form.state.request
              ? editableFields(form.state.request)
              : emptyRequest
          }
          onSave={async (values) => {
            const saved = await form.save(values)
            void navigate('/requests', {
              state: {
                requestSuccess: `Solicitação ${saved.code} ${mode === 'edit' ? 'atualizada' : 'criada'} com sucesso.`,
              },
            })
          }}
        />
      )}
    </>
  )
}
