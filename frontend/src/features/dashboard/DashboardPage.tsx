import { Link } from 'react-router'
import type { PortalServices } from '@/contracts/portal'
import { useIndicators } from './useIndicators'
import { DashboardIndicators } from './DashboardIndicators'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/layout/SectionHeader'

export function DashboardPage({ services }: { services?: PortalServices }) {
  const indicators = useIndicators(services)
  return (
    <>
      <SectionHeader>
        <p>Visão geral das solicitações internas.</p>
        <Button variant="outline" asChild>
          <Link to="/requests">Ver solicitações</Link>
        </Button>
      </SectionHeader>
      <p className="mb-4 text-sm text-muted-foreground">
        Demonstração com dados simulados. As alterações duram até recarregar a
        página.
      </p>
      <DashboardIndicators {...indicators} />
    </>
  )
}
