import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { AtlasMark } from '@/components/layout/AtlasMark'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { useSession } from '@/features/auth/queries'
import { safeNextPath } from '@/features/auth/utils'

export function AdminLoginPage() {
  const [searchParams] = useSearchParams()
  const next = safeNextPath(searchParams.get('next') ?? '/admin')
  const navigate = useNavigate()
  const session = useSession()

  // Already in, or a preview where the owner check replaces logging in.
  if (session.data?.admin || session.data?.mode === 'owner') return <Navigate to={next} replace />

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <title>Admin login · Flavor Atlas</title>
      <div className="w-full max-w-sm space-y-6">
        <Link to="/" className="flex items-center gap-2">
          <AtlasMark className="size-7" />
          <span className="font-display text-2xl">Flavor Atlas</span>
        </Link>
        <header className="space-y-1">
          <h1 className="text-5xl">
            Admin <em>login</em>
          </h1>
          <p className="text-ink-muted">Add and edit recipes, manage reviews and use the AI helpers.</p>
        </header>
        <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
          <LoginForm autoFocus onSuccess={() => navigate(next, { replace: true })} />
        </div>
        <Link to="/" className="label-mono inline-flex min-h-10 items-center text-ink-subtle hover:text-ink">
          Back to the site
        </Link>
      </div>
    </main>
  )
}
