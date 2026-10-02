import { Link, NavLink, Outlet } from 'react-router'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-100 text-brand-700' : 'text-stone-600 hover:bg-stone-100'
  }`

export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold">
            <span aria-hidden>🗺️</span>
            <span>Flavor Atlas</span>
          </Link>
          <div className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Explore
            </NavLink>
            <NavLink to="/recipes/new" className={navLinkClass}>
              + New recipe
            </NavLink>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-stone-200 py-4 text-center text-xs text-stone-500">
        Flavor Atlas · recipes from around the world
      </footer>
    </div>
  )
}
