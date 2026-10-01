import { useEffect } from 'react'
import { LifeBuoy } from 'lucide-react'
import { Link } from 'react-router'

export function LoginPage() {
  useEffect(() => {
    document.title = 'Login | Cubity Support'
  }, [])
  return (
    <main className="login-page">
      <section className="panel login-panel" aria-labelledby="login-title">
        <LifeBuoy size={30} className="login-logo" aria-hidden="true" />
        <p className="eyebrow">Cubity Support</p>
        <h1 id="login-title">Acesse o portal</h1>
        <p>
          O acesso com usuário e senha estará disponível na etapa de
          autenticação.
        </p>
        <Link to="/dashboard" className="button">
          Visualizar estrutura do portal
        </Link>
      </section>
    </main>
  )
}
