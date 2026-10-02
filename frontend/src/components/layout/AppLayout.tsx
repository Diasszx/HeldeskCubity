import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Sidebar } from './Sidebar'
import { PageHeader } from './PageHeader'

function pageTitle(pathname: string) {
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname === '/requests/new') return 'Nova solicitação'
  if (/^\/requests\/[^/]+\/edit$/.test(pathname)) return 'Editar solicitação'
  if (/^\/requests\/[^/]+$/.test(pathname)) return 'Detalhes da solicitação'
  if (pathname === '/requests') return 'Solicitações'
  return 'Página não encontrada'
}

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const main = useRef<HTMLElement>(null)
  const location = useLocation()
  const title = pageTitle(location.pathname.replace(/\/$/, ''))
  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    document.title = `${title} | Cubity Support`
    main.current?.focus()
  }, [location.pathname, title])

  return (
    <div
      className="min-h-dvh md:grid md:grid-cols-[244px_minmax(0,1fr)]"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          closeMenu()
          menuButton.current?.focus()
        }
      }}
    >
      <a
        href="#main-content"
        className="fixed -top-32 left-4 z-20 rounded-md border bg-card p-3 text-card-foreground focus:top-3"
      >
        Pular para o conteúdo
      </a>
      <Sidebar
        open={menuOpen}
        onToggle={() => setMenuOpen((open) => !open)}
        onNavigate={closeMenu}
        menuRef={menuButton}
      />
      <div className="min-w-0 px-4 pb-6 md:px-8 md:pb-8">
        <PageHeader title={title} />
        <main
          ref={main}
          id="main-content"
          tabIndex={-1}
          className="pt-6 focus:outline-none"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
