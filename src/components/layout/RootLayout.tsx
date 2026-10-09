import { useQuery } from '@tanstack/react-query'
import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'
import { useSession } from '@/features/auth/queries'
import { CuisinePalettes } from '@/features/cuisines/components/CuisinePalettes'
import { CuisineStrip } from '@/features/cuisines/components/CuisineStrip'
import { cuisineQueries } from '@/features/cuisines/queries'
import { useSavedRecipeIds } from '@/features/saved/useSavedRecipes'
import { AtlasMark } from './AtlasMark'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-10 items-center rounded-full px-2.5 text-sm sm:px-3 font-medium whitespace-nowrap ${
    isActive ? 'text-ink' : 'text-ink-muted hover:text-ink'
  }`

/** The public site: read-only. Everything that changes data lives under /admin. */
export function RootLayout() {
  const session = useSession().data
  const cuisines = useQuery(cuisineQueries.list()).data
  const savedCount = useSavedRecipeIds().length
  // The admin link stays quiet in the footer. In the phone preview only the owner sees it.
  const showAdminLink = session?.mode === 'password' || session?.admin

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Colors for cuisines added from the admin; a stable slot, so pages never remount. */}
      <CuisinePalettes />
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5">
          <Link to="/" className="flex min-h-10 min-w-10 items-center justify-center gap-2 whitespace-nowrap">
            <AtlasMark className="size-7" />
            {/* On the narrowest phones the wordmark gives way to the nav (the mark stays). */}
            <span className="font-display text-2xl leading-none max-[359px]:sr-only">Flavor Atlas</span>
          </Link>
          <nav aria-label="Main" className="flex items-center">
            {/* On phones the logo is the way home, which leaves room for "Saved". */}
            <NavLink to="/" end className={(state) => `${navLinkClass(state)} max-sm:hidden`}>
              Home
            </NavLink>
            <NavLink to="/search" className={navLinkClass} aria-label="Search">
              <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4.5 4.5" />
              </svg>
              {/* The icon alone on phones; the aria-label names it either way. */}
              <span className="ml-1.5 max-sm:hidden">Search</span>
            </NavLink>
            <NavLink to="/recipes" className={navLinkClass}>
              {/* "Recipes" on phones so the header fits at 320px. */}
              <span className="max-sm:hidden">All recipes</span>
              <span className="sm:hidden">Recipes</span>
            </NavLink>
            <NavLink to="/saved" className={navLinkClass}>
              Saved
              {savedCount > 0 && (
                <span className="ml-1.5 rounded-full bg-accent-soft px-1.5 font-mono text-xs leading-5 text-accent-ink tabular-nums">
                  <span className="sr-only">(</span>
                  {savedCount}
                  <span className="sr-only">)</span>
                </span>
              )}
            </NavLink>
          </nav>
        </div>
      </header>

      <CuisineStrip />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16 sm:pt-10">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.4fr_1fr_auto]">
          <div className="space-y-2">
            <p className="flex items-center gap-2 font-display text-2xl">
              <AtlasMark className="size-6" /> Flavor Atlas
            </p>
            <p className="max-w-xs text-sm text-ink-muted">
              Recipes from home kitchens, grouped by where they come from.
            </p>
          </div>
          <nav aria-label="Cuisines" className="space-y-2">
            <p className="label-mono text-ink-subtle">Cuisines</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {cuisines?.map((cuisine) => (
                <li key={cuisine.id}>
                  <Link to={`/cuisines/${cuisine.id}`} className="inline-flex min-h-10 items-center text-ink-muted hover:text-ink">
                    {cuisine.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {showAdminLink && (
            <div className="sm:text-right">
              <Link to="/admin" className="label-mono inline-flex min-h-10 items-center text-ink-subtle hover:text-ink">
                Admin
              </Link>
            </div>
          )}
        </div>
      </footer>

      <ScrollRestoration />
    </div>
  )
}
