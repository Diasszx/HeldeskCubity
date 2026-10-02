import { Link, useParams } from 'react-router'
import { Plus } from 'lucide-react'
import { Placeholder } from '@/components/Placeholder'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/layout/SectionHeader'

export function RequestsPage() {
  return (
    <>
      <SectionHeader>
        <p>Acompanhe as demandas da sua equipe.</p>
        <Button asChild>
          <Link to="/requests/new">
            <Plus aria-hidden="true" />
            Nova solicitação
          </Link>
        </Button>
      </SectionHeader>
      <Placeholder title="Listagem em preparação">
        As solicitações e os filtros estarão disponíveis nas próximas etapas.
      </Placeholder>
    </>
  )
}

export function RequestPage({ mode }: { mode: 'new' | 'details' | 'edit' }) {
  const { id } = useParams()
  return (
    <>
      <SectionHeader>
        <Button variant="link" asChild className="px-0">
          <Link to="/requests">← Voltar para solicitações</Link>
        </Button>
      </SectionHeader>
      <Placeholder
        title={
          mode === 'new'
            ? 'Registre uma demanda'
            : mode === 'edit'
              ? 'Edição da solicitação'
              : 'Informações da solicitação'
        }
      >
        {mode === 'new'
          ? 'O formulário de cadastro será disponibilizado na etapa de formulários.'
          : `Endereço da solicitação: ${id}. Os dados e as ações serão disponibilizados nas próximas etapas.`}
      </Placeholder>
    </>
  )
}
