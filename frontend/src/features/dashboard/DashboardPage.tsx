import { Link } from 'react-router'
import { Placeholder } from '../../components/Placeholder'

export function DashboardPage() {
  return (
    <>
      <div className="section-heading">
        <p>Visão geral das solicitações internas.</p>
        <Link to="/requests" className="button button-secondary">
          Ver solicitações
        </Link>
      </div>
      <Placeholder title="Indicadores em breve">
        Os totais e indicadores serão apresentados quando os dados das
        solicitações estiverem disponíveis.
      </Placeholder>
    </>
  )
}
