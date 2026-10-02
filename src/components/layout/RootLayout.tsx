import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-accent-soft text-accent-ink' : 'text-ink-muted hover:bg-surface-sunken'
  }`

export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-10 border-b border-line bg-surface/90 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold whitespace-nowrap">
            <span aria-hidden>🗺️</span>
            <span>Flavor Atlas</span>
          </Link>
          <div className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Explore
            </NavLink>
            <NavLink to="/recipes/new" className={navLinkClass}>
              + New<span className="hidden sm:inline"> recipe</span>
            </NavLink>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-line py-4 text-center text-xs text-ink-subtle">
        Flavor Atlas · recipes from around the world
      </footer>

      <ScrollRestoration />
    </div>
  )
}
