import { useId, useState, type FormEvent } from 'react'
import { inputClass } from '@/components/ui/formStyles'
import { AuthError } from '@/services/auth'
import { useLogin } from '../queries'

/** The password form, shared by the login page and the "session ended" banner. */
export function LoginForm({ onSuccess, autoFocus = false }: { onSuccess?: () => void; autoFocus?: boolean }) {
  const login = useLogin()
  const [password, setPassword] = useState('')
  // useId keeps ids unique if the form appears twice on one page.
  const id = useId()
  const passwordId = `${id}-password`
  const messageId = `${id}-message`

  const onSubmit = (event: FormEvent) => {
    // Stop the event here: this form can sit inside the recipe form's page.
    event.preventDefault()
    event.stopPropagation()
    login.mutate(password, {
      onSuccess,
      onError: () => setPassword(''),
    })
  }

  const error = login.error instanceof AuthError ? login.error.message : login.error ? 'Login failed. Try again.' : null

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={passwordId} className="text-sm font-semibold">
          Admin password
        </label>
        <input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          autoFocus={autoFocus}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? messageId : undefined}
          className={inputClass}
        />
        <p id={messageId} role="alert" className="text-sm text-danger empty:hidden">
          {error}
        </p>
      </div>
      <button
        type="submit"
        disabled={login.isPending || !password}
        className="min-h-10 w-full rounded-full bg-ink px-5 font-semibold text-canvas hover:bg-accent disabled:opacity-60"
      >
        {login.isPending ? 'Checking…' : 'Log in'}
      </button>
    </form>
  )
}
