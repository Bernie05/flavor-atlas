import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { useSession } from '@/features/auth/queries'
import { safeNextPath } from '@/features/auth/utils'

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const next = safeNextPath(searchParams.get('next'))
  const navigate = useNavigate()
  const session = useSession()

  // Already admin, or a preview where logging in doesn't apply.
  if (session.data?.admin) return <Navigate to={next} replace />
  if (session.data?.mode === 'owner') return <Navigate to="/" replace />

  return (
    <section className="mx-auto max-w-sm space-y-6 py-10">
      <title>Admin login · Flavor Atlas</title>
      <header className="space-y-1">
        <p className="label-mono text-accent-ink">Admin</p>
        <h1 className="text-4xl">Log in</h1>
        <p className="text-ink-muted">Log in to add, edit and rate recipes, and to use the AI helpers.</p>
      </header>
      <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
        <LoginForm autoFocus onSuccess={() => navigate(next, { replace: true })} />
      </div>
    </section>
  )
}
