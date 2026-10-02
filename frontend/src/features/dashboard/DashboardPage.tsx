import { Link } from 'react-router'
import { Placeholder } from '@/components/Placeholder'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/layout/SectionHeader'

export function DashboardPage() {
  return (
    <>
      <SectionHeader>
        <p>Visão geral das solicitações internas.</p>
        <Button variant="outline" asChild>
          <Link to="/requests">Ver solicitações</Link>
        </Button>
      </SectionHeader>
      <Placeholder title="Indicadores em breve">
        Os totais e indicadores serão apresentados quando os dados das
        solicitações estiverem disponíveis.
      </Placeholder>
    </>
  )
}
