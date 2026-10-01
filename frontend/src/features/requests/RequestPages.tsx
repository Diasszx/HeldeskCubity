import { Link, useParams } from 'react-router'
import { Plus } from 'lucide-react'
import { Placeholder } from '../../components/Placeholder'

export function RequestsPage() {
  return (
    <>
      <div className="section-heading">
        <p>Acompanhe as demandas da sua equipe.</p>
        <Link to="/requests/new" className="button">
          <Plus size={17} aria-hidden="true" />
          Nova solicitação
        </Link>
      </div>
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
      <div className="section-heading">
        <Link to="/requests" className="text-link">
          ← Voltar para solicitações
        </Link>
      </div>
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
