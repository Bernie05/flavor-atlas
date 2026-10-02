import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'
import { AtlasMark } from './AtlasMark'

export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-10 border-b border-line bg-canvas/85 backdrop-blur-md">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 whitespace-nowrap">
            <AtlasMark className="size-7" />
            <span className="font-display text-xl">Flavor Atlas</span>
          </Link>
          <div className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `inline-flex min-h-10 items-center rounded-full px-3 text-sm font-medium whitespace-nowrap ${
                  isActive ? 'text-ink' : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              Explore
            </NavLink>
            <NavLink
              to="/recipes/new"
              aria-label="New recipe"
              className="inline-flex min-h-10 items-center rounded-full bg-ink px-3.5 text-sm font-semibold whitespace-nowrap text-canvas hover:bg-accent"
            >
              + New<span className="hidden sm:inline"> recipe</span>
            </NavLink>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-line py-5">
        <p className="label-mono mx-auto max-w-5xl px-4 text-ink-subtle">
          Flavor Atlas · Recipes from home kitchens around the world
        </p>
      </footer>

      <ScrollRestoration />
    </div>
  )
}
