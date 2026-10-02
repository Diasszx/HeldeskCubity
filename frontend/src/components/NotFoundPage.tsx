import { Link } from 'react-router'
import { Button } from './ui/button'
import { Card, CardContent, CardTitle, CardDescription } from './ui/card'

export function NotFoundPage() {
  return (
    <Card asChild>
      <section>
        <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground">
            404
          </span>
          <CardTitle asChild>
            <h2>Não encontramos esta página</h2>
          </CardTitle>
          <CardDescription asChild>
            <p>Confira o endereço ou volte ao dashboard para continuar.</p>
          </CardDescription>
          <Button asChild>
            <Link to="/dashboard">Voltar ao dashboard</Link>
          </Button>
        </CardContent>
      </section>
    </Card>
  )
}
