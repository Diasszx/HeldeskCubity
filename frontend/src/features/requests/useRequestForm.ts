import { useEffect, useState } from 'react'
import type {
  Category,
  PortalServices,
  Request,
  RequestInput,
} from '@/contracts/portal'
import { portalServices } from '@/services/portal-services'
import { loadRequestForm } from './request-form'

type FormState =
  | { phase: 'loading' }
  | { phase: 'error'; error: string }
  | { phase: 'ready'; categories: Category[]; request?: Request }

export function useRequestForm(
  id?: string,
  services: PortalServices = portalServices,
) {
  const [state, setState] = useState<FormState>({ phase: 'loading' })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    void loadRequestForm(services, id)
      .then((data) => {
        if (active) setState({ phase: 'ready', ...data })
      })
      .catch((error: unknown) => {
        if (active)
          setState({
            phase: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'Não foi possível carregar o formulário.',
          })
      })
    return () => {
      active = false
    }
  }, [id, services, revision])
  return {
    state,
    retry() {
      setState({ phase: 'loading' })
      setRevision((value) => value + 1)
    },
    save: (values: RequestInput) =>
      id
        ? services.requests.update(id, values)
        : services.requests.create(values),
  }
}
