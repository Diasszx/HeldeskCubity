import { Navigate, Outlet, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from './auth-context'
export function RequireSession() {
  const { state, refresh } = useAuth(),
    location = useLocation()
  if (state.phase === 'loading')
    return (
      <main className="p-6">
        <p role="status">Verificando sessão…</p>
      </main>
    )
  if (state.phase === 'error')
    return (
      <main className="grid justify-items-start gap-4 p-6">
        <p role="alert">{state.message}</p>
        <Button onClick={refresh}>Tentar novamente</Button>
      </main>
    )
  if (state.phase === 'unauthenticated')
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    )
  return <Outlet />
}
