import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import { Button } from '../shared/ui/Button'
import { useAuthStore } from '../shared/store/authStore'
import { useSavedStore } from '../shared/store/savedStore'
import { useToastStore } from '../shared/store/toastStore'
import { authApi } from '../shared/api/authApi'

/* Email + password sign-in / register screen. On success the guest's local
   saved set is merged into the server (saved_places) and the reconciled set
   replaces the local store, so saves persist cross-device. Returns the user to
   wherever they came from (location.state.from) or Explore. */
type Mode = 'login' | 'register'

export default function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/explore'

  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const busy = useAuthStore((s) => s.busy)
  const user = useAuthStore((s) => s.user)
  const showToast = useToastStore((s) => s.show)

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  // already signed in — offer a way back rather than a dead form
  if (user) {
    return (
      <AppShell>
        <div className="fg-page">
          <div className="fg-page-in">
            <div className="fg-page-h">
              <div>
                <span className="kicker">Account</span>
                <h1>Signed in</h1>
                <div className="sub">You're signed in as {user.email}.</div>
              </div>
            </div>
            <div className="fg-form-actions">
              <Button variant="solid" onClick={() => navigate('/explore')}>Back to Explore</Button>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || password.length < (mode === 'register' ? 8 : 1)) {
      setError(mode === 'register' ? 'Enter an email and a password of at least 8 characters.' : 'Enter your email and password.')
      return
    }
    try {
      if (mode === 'register') {
        await register({ email: email.trim(), password, name: name.trim() || undefined })
      } else {
        await login({ email: email.trim(), password })
      }
      // merge guest localStorage saves into the server set, then reconcile
      const token = useAuthStore.getState().accessToken
      if (token) {
        try {
          const merged = await authApi.mergeSaved(token, useSavedStore.getState().ids)
          useSavedStore.getState().replace(merged)
        } catch {
          /* non-fatal — local saves stay intact */
        }
      }
      showToast(mode === 'register' ? 'Account created — welcome' : 'Signed in')
      navigate(from)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <AppShell>
      <div className="fg-page">
        <div className="fg-page-in" style={{ maxWidth: 460 }}>
          <div className="fg-page-h">
            <div>
              <span className="kicker">Field guide access</span>
              <h1>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
              <div className="sub">
                Saving spots and contributing need an account. Browsing is open to everyone.
              </div>
            </div>
          </div>

          <form className="fg-form" onSubmit={submit}>
            {mode === 'register' && (
              <div className="fg-field">
                <label htmlFor="auth-name">Name <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input id="auth-name" type="text" value={name} autoComplete="name"
                  placeholder="How should we credit you?" onChange={(e) => setName(e.target.value)} />
              </div>
            )}

            <div className="fg-field">
              <label htmlFor="auth-email">Email</label>
              <input id="auth-email" type="email" value={email} autoComplete="email"
                placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="fg-field" data-err={!!error}>
              <label htmlFor="auth-password">Password</label>
              <input id="auth-password" type="password" value={password}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                onChange={(e) => setPassword(e.target.value)} />
              {error && <div className="err">{error}</div>}
            </div>

            <div className="fg-form-actions">
              <Button type="submit" variant="solid" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
              <button type="button" className="fg-linkbtn"
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}>
                {mode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
