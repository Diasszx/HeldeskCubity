import { useEffect, useState } from 'react'
import type { PortalServices, RequestFilters } from '@/contracts/portal'
import { portalServices } from '@/services/portal-services'
import { ServiceError } from '@/services/service-error'
import { loadRequestList, type RequestListData } from './request-list'

interface ListState extends RequestListData {
  phase: 'loading' | 'ready' | 'error'
  error: string | null
}

export function useRequestsList(services: PortalServices = portalServices) {
  const [query, setQuery] = useState<{
    filters: RequestFilters
    revision: number
  }>({ filters: {}, revision: 0 })
  const [state, setState] = useState<ListState>({
    rows: [],
    categories: [],
    phase: 'loading',
    error: null,
  })

  useEffect(() => {
    let active = true
    loadRequestList(services, query.filters).then(
      (data) => {
        if (active) setState({ ...data, phase: 'ready', error: null })
      },
      (error: unknown) => {
        if (!active) return
        const message =
          error instanceof ServiceError
            ? error.message
            : 'Não foi possível carregar as solicitações. Tente novamente.'
        setState((previous) => ({
          ...previous,
          phase: 'error',
          error: message,
        }))
      },
    )
    return () => {
      active = false
    }
  }, [services, query])

  function applyFilters(filters: RequestFilters) {
    setState((previous) => ({ ...previous, phase: 'loading', error: null }))
    setQuery((previous) => ({ filters, revision: previous.revision + 1 }))
  }

  return { ...state, applyFilters, retry: () => applyFilters(query.filters) }
}
