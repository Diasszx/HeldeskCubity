import { useEffect, useRef, useState } from 'react'
import type { PortalServices } from '@/contracts/portal'
import { portalServices } from '@/services/portal-services'
import {
  availableRequestActions,
  loadRequestDetails,
  requestError,
  type RequestDetails,
} from './request-details'

type DetailsState =
  | { phase: 'loading' }
  | { phase: 'error'; error: ReturnType<typeof requestError> }
  | { phase: 'ready'; data: RequestDetails }

export function useRequestDetails(
  id: string,
  services: PortalServices = portalServices,
) {
  const [state, setState] = useState<DetailsState>({ phase: 'loading' })
  const [revision, setRevision] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ReturnType<typeof requestError>>()
  const [success, setSuccess] = useState('')
  const [blocked, setBlocked] = useState(false)
  const locked = useRef(false)
  const active = useRef(false)
  useEffect(() => {
    active.current = true
    let current = true
    void loadRequestDetails(services, id)
      .then((data) => {
        if (current) setState({ phase: 'ready', data })
      })
      .catch((failure: unknown) => {
        if (current) setState({ phase: 'error', error: requestError(failure) })
      })
    return () => {
      current = false
      active.current = false
    }
  }, [id, services, revision])

  function reload() {
    if (locked.current) return
    setState({ phase: 'loading' })
    setError(undefined)
    setSuccess('')
    setBlocked(false)
    setRevision((value) => value + 1)
  }

  async function perform(operation: 'advance' | 'remove'): Promise<boolean> {
    if (locked.current || blocked || state.phase !== 'ready') return false
    const actions = availableRequestActions(
      state.data.request,
      state.data.currentUser,
    )
    if (operation === 'remove' ? !actions.removable : !actions.nextStatus)
      return false
    locked.current = true
    setPending(true)
    setError(undefined)
    setSuccess('')
    try {
      if (operation === 'remove') await services.requests.remove(id)
      else {
        const request = await services.requests.changeStatus(
          id,
          actions.nextStatus!,
        )
        if (active.current) {
          setState({ phase: 'ready', data: { ...state.data, request } })
          setSuccess('Status atualizado com sucesso.')
        }
      }
      return active.current
    } catch (failure) {
      if (active.current) {
        const nextError = requestError(failure)
        setError(nextError)
        if (nextError.code !== 'NETWORK' && nextError.code !== 'VALIDATION')
          setBlocked(true)
        if (nextError.code === 'NOT_FOUND')
          setState({ phase: 'error', error: nextError })
      }
      return false
    } finally {
      locked.current = false
      if (active.current) setPending(false)
    }
  }
  return {
    state,
    pending,
    error,
    success,
    blocked,
    reload,
    advance: () => perform('advance'),
    remove: () => perform('remove'),
  }
}
