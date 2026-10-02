import { useEffect, useState } from 'react'
import type { PortalServices } from '@/contracts/portal'
import { portalServices } from '@/services/portal-services'
import { loadIndicators, type RequestIndicators } from './indicators'

type IndicatorState =
  | { phase: 'loading' }
  | { phase: 'ready'; counts: RequestIndicators }
  | { phase: 'error'; message: string }

export function useIndicators(services: PortalServices = portalServices) {
  const [state, setState] = useState<IndicatorState>({ phase: 'loading' })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    void loadIndicators(services)
      .then((counts) => {
        if (active) setState({ phase: 'ready', counts })
      })
      .catch((error: unknown) => {
        if (active)
          setState({
            phase: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Não foi possível carregar os indicadores.',
          })
      })
    return () => {
      active = false
    }
  }, [services, revision])
  return {
    state,
    retry() {
      setState({ phase: 'loading' })
      setRevision((value) => value + 1)
    },
  }
}
