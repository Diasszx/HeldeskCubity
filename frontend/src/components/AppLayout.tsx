import { useEffect, useRef, useState } from 'react'
import { LayoutDashboard, LifeBuoy, Menu, Ticket, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const main = useRef<HTMLElement>(null)
  const location = useLocation()
  const pathname = location.pathname.replace(/\/$/, '')
  const title =
    pathname === '/dashboard'
      ? 'Dashboard'
      : pathname === '/requests/new'
        ? 'Nova solicitação'
        : /^\/requests\/[^/]+\/edit$/.test(pathname)
          ? 'Editar solicitação'
          : /^\/requests\/[^/]+$/.test(pathname)
            ? 'Detalhes da solicitação'
            : pathname === '/requests'
              ? 'Solicitações'
              : 'Página não encontrada'

  useEffect(() => {
    document.title = `${title} | Cubity Support`
    main.current?.focus()
  }, [location.pathname, title])

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div
      className="app-shell"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          closeMenu()
          menuButton.current?.focus()
        }
      }}
    >
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link to="/dashboard" className="brand" onClick={closeMenu}>
            <LifeBuoy size={26} aria-hidden="true" />
            <span>
              Cubity<span className="brand-subtitle">SUPPORT</span>
            </span>
          </Link>
          <button
            ref={menuButton}
            className="menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
        <nav
          id="main-navigation"
          aria-label="Navegação principal"
          className={`navigation ${menuOpen ? 'is-open' : ''}`}
        >
          <NavLink to="/dashboard" onClick={closeMenu}>
            <LayoutDashboard size={19} aria-hidden="true" />
            Dashboard
          </NavLink>
          <NavLink to="/requests" onClick={closeMenu}>
            <Ticket size={19} aria-hidden="true" />
            Solicitações
          </NavLink>
        </nav>
        <p className="sidebar-caption">Portal de Solicitações Internas</p>
      </aside>
      <div className="workspace">
        <header className="page-header">
          <h1>{title}</h1>
          <Link to="/login" className="button button-secondary">
            Login
          </Link>
        </header>
        <main
          ref={main}
          id="main-content"
          tabIndex={-1}
          className="page-content"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
