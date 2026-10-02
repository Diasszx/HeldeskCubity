import { useEffect, useRef, useState, type ReactNode } from 'react'
import { portalSession } from '@/services/portal-services'
import type { SessionAdapter } from '@/services/session-services'
import { ServiceError } from '@/services/service-error'
import { AuthContext, type SessionState } from './auth-context'
export function AuthProvider({
  children,
  adapter = portalSession,
}: {
  children: ReactNode
  adapter?: SessionAdapter
}) {
  const [state, setState] = useState<SessionState>({
    phase: 'loading',
    user: null,
  })
  const [pending, setPending] = useState(false)
  const [revision, setRevision] = useState(0)
  const generation = useRef(0),
    mounted = useRef(false),
    locked = useRef(false)
  useEffect(() => {
    mounted.current = true
    const version = ++generation.current
    void adapter.services.users
      .current()
      .then((user) => {
        if (mounted.current && version === generation.current)
          setState({ phase: user ? 'authenticated' : 'unauthenticated', user })
      })
      .catch((error: unknown) => {
        if (mounted.current && version === generation.current)
          setState({
            phase: 'error',
            user: null,
            message:
              error instanceof Error
                ? error.message
                : 'Não foi possível verificar a sessão.',
          })
      })
    return () => {
      mounted.current = false
    }
  }, [adapter, revision])
  useEffect(
    () =>
      adapter.subscribe(() => {
        generation.current++
        setState({
          phase: 'unauthenticated',
          user: null,
          message: 'Sua sessão expirou. Entre novamente.',
        })
      }),
    [adapter],
  )
  async function login(input: { username: string; password: string }) {
    if (locked.current)
      throw new ServiceError('CONFLICT', 'Aguarde a operação atual.')
    locked.current = true
    setPending(true)
    const version = ++generation.current
    try {
      const user = await adapter.services.auth.login(input)
      if (!mounted.current || version !== generation.current)
        throw new ServiceError(
          'UNAUTHENTICATED',
          'Verifique a sessão novamente.',
        )
      setState({ phase: 'authenticated', user })
    } finally {
      locked.current = false
      if (mounted.current) setPending(false)
    }
  }
  async function logout() {
    if (locked.current) return
    locked.current = true
    setPending(true)
    const version = ++generation.current
    try {
      try {
        await adapter.services.auth.logout()
      } catch (error) {
        if (!(
          error instanceof ServiceError && error.code === 'UNAUTHENTICATED'
        ))
          throw error
      }
      if (mounted.current && version === generation.current)
        setState({ phase: 'unauthenticated', user: null })
    } finally {
      locked.current = false
      if (mounted.current) setPending(false)
    }
  }
  function refresh() {
    if (locked.current) return
    setState({ phase: 'loading', user: null })
    setRevision((value) => value + 1)
  }
  return (
    <AuthContext.Provider value={{ state, pending, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}
