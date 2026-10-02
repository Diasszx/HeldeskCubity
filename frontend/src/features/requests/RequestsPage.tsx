import { Link, useLocation } from 'react-router'
import { Plus } from 'lucide-react'
import type { PortalServices } from '@/contracts/portal'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { useRequestsList } from './useRequestsList'
import { RequestFiltersForm } from './RequestFiltersForm'
import { RequestListResults } from './RequestListResults'

export function RequestsPage({ services }: { services?: PortalServices }) {
  const list = useRequestsList(services)
  const location = useLocation()
  const success: unknown = location.state?.requestSuccess
  return (
    <>
      {typeof success === 'string' && (
        <p role="status" className="mb-4 text-sm text-foreground">
          {success}
        </p>
      )}
      <SectionHeader>
        <p>Acompanhe as demandas da sua equipe.</p>
        <Button asChild>
          <Link to="/requests/new">
            <Plus aria-hidden="true" />
            Nova solicitação
          </Link>
        </Button>
      </SectionHeader>
      <p className="mb-4 text-sm text-muted-foreground">
        Demonstração com dados simulados.
      </p>
      <div className="grid min-w-0 grid-cols-1 gap-6">
        <RequestFiltersForm
          categories={list.categories}
          loading={list.phase === 'loading'}
          onApply={list.applyFilters}
        />
        <RequestListResults
          rows={list.rows}
          phase={list.phase}
          error={list.error}
          onRetry={list.retry}
        />
      </div>
    </>
  )
}
