import { useEffect } from 'react'
import { LifeBuoy } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'

export function LoginPage() {
  useEffect(() => {
    document.title = 'Login | Cubity Support'
  }, [])
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
            <CardDescription asChild>
              <p>
                O acesso com usuário e senha estará disponível na etapa de
                autenticação.
              </p>
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full whitespace-normal text-center">
              <Link to="/dashboard">Visualizar estrutura do portal</Link>
            </Button>
          </CardFooter>
        </section>
      </Card>
    </main>
  )
}
