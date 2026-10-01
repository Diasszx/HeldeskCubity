import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="panel placeholder">
      <span className="eyebrow">404</span>
      <h2>Não encontramos esta página</h2>
      <p>Confira o endereço ou volte ao dashboard para continuar.</p>
      <Link className="button" to="/dashboard">
        Voltar ao dashboard
      </Link>
    </section>
  )
}
