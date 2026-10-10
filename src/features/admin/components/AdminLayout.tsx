import { useRef } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useNavigate } from 'react-router'
import { AtlasMark } from '@/components/layout/AtlasMark'
import { CuisinePalettes } from '@/features/cuisines/components/CuisinePalettes'
import { useLogout, useSession } from '@/features/auth/queries'
import { useRouteFocus } from '@/lib/useRouteFocus'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition-colors ${
    isActive ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink'
  }`

/** The admin side: a plain, task-focused workspace in the same visual system. */
export function AdminLayout() {
  const session = useSession().data
  const logout = useLogout()
  const navigate = useNavigate()
  const mainRef = useRef<HTMLElement>(null)
  useRouteFocus(mainRef)

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Colors for cuisines added from the admin; a stable slot, so pages never remount. */}
      <CuisinePalettes />
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 pt-2.5">
          <Link to="/admin" aria-label="Flavor Atlas admin dashboard" className="flex items-center gap-2 whitespace-nowrap">
            <AtlasMark className="size-7" />
            <span className="hidden font-display text-2xl leading-none sm:inline">Flavor Atlas</span>
            <span className="label-mono rounded-full bg-ink px-2 py-0.5 text-canvas">Admin</span>
          </Link>
          <div className="flex items-center">
            <Link to="/" className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-medium whitespace-nowrap text-ink-muted hover:text-ink">
              View site
            </Link>
            {session?.mode === 'password' && session.admin && (
              <button
                type="button"
                onClick={() => {
                  // Leave the admin area first, so it doesn't flash a "session ended" banner.
                  navigate('/')
                  logout.mutate()
                }}
                className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-medium whitespace-nowrap text-ink-muted hover:text-ink"
              >
                Log out
              </button>
            )}
          </div>
        </div>
        <nav aria-label="Admin" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
          <NavLink to="/admin" end className={tabClass}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/recipes" className={tabClass}>
            Recipes
          </NavLink>
          <NavLink to="/admin/cuisines" className={tabClass}>
            Cuisines
          </NavLink>
          <NavLink to="/admin/dishes" className={tabClass}>
            Dishes
          </NavLink>
          <NavLink to="/admin/reviews" className={tabClass}>
            Reviews
          </NavLink>
        </nav>
      </header>

      <main ref={mainRef} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  )
}
