import { useId, useState, type FormEvent } from 'react'
import { inputClass } from '@/components/ui/formStyles'
import { AuthError } from '@/services/auth'
import { useLogin } from '../queries'

/** The admin's username and password, shared by the login page and the "session ended" banner. */
export function LoginForm({ onSuccess, autoFocus = false }: { onSuccess?: () => void; autoFocus?: boolean }) {
  const login = useLogin()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  // useId keeps ids unique if the form appears twice on one page.
  const id = useId()
  const usernameId = `${id}-username`
  const passwordId = `${id}-password`
  const messageId = `${id}-message`

  const onSubmit = (event: FormEvent) => {
    // Stop the event here: this form can sit inside the recipe form's page.
    event.preventDefault()
    event.stopPropagation()
    login.mutate(
      { username, password },
      // Keep the username (usually right), clear the password to try again.
      { onSuccess, onError: () => setPassword('') },
    )
  }

  const error = login.error instanceof AuthError ? login.error.message : login.error ? 'Login failed. Try again.' : null
  // Both fields are described by the one message: it can't (and mustn't) say which was wrong.
  const fieldProps = { 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? messageId : undefined, className: inputClass }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={usernameId} className="text-sm font-semibold">
          Username
        </label>
        <input
          id={usernameId}
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus={autoFocus}
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          {...fieldProps}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={passwordId} className="text-sm font-semibold">
          Password
        </label>
        <input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          {...fieldProps}
        />
        <p id={messageId} role="alert" className="text-sm text-danger empty:hidden">
          {error}
        </p>
      </div>
      <button
        type="submit"
        disabled={login.isPending || !username.trim() || !password}
        className="min-h-10 w-full rounded-full bg-ink px-5 font-semibold text-canvas hover:bg-accent disabled:opacity-60"
      >
        {login.isPending ? 'Checking…' : 'Log in'}
      </button>
    </form>
  )
}
