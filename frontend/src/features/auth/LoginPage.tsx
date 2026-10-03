import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router'
import { LifeBuoy } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from './auth-context'
import { LoginForm } from './LoginForm'
import { loginDestination } from './login-schema'

export function LoginPage() {
  const auth = useAuth()
  const location = useLocation()
  useEffect(() => {
    document.title = 'Login | Cubity Support'
  }, [])
  if (auth.state.phase === 'authenticated')
    return <Navigate to={loginDestination(location.state?.from)} replace />
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <Card asChild className="w-full max-w-md">
        <section aria-labelledby="login-title">
          <CardHeader>
            <LifeBuoy className="mb-2 size-8 text-primary" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Cubity Support
            </p>
            <CardTitle asChild>
              <h1 id="login-title" className="text-2xl">
                Acesse o portal
              </h1>
            </CardTitle>
            <CardDescription>
              Entre para acompanhar e registrar solicitações internas.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            {auth.state.phase === 'loading' && (
              <p role="status">Verificando sessão…</p>
            )}
            {auth.state.phase === 'error' && (
              <>
                <p role="alert" className="text-sm text-destructive">
                  {auth.state.message}
                </p>
                <Button onClick={auth.refresh}>Tentar novamente</Button>
              </>
            )}
            {auth.state.phase === 'unauthenticated' && (
              <>
                {auth.state.message && (
                  <p role="alert" className="text-sm text-destructive">
                    {auth.state.message}
                  </p>
                )}
                <LoginForm onLogin={auth.login} />
                <p className="text-sm text-muted-foreground">
                  Usuários de demonstração: ana.demo ou bruno.demo. Senha:
                  demo123.
                </p>
              </>
            )}
          </CardContent>
        </section>
      </Card>
    </main>
  )
}
