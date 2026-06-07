import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import { Button } from '../shared/ui/Button'
import { GoogleButton } from '../features/auth/GoogleButton'
import { useAuthStore } from '../shared/store/authStore'
import { useSavedStore } from '../shared/store/savedStore'
import { useToastStore } from '../shared/store/toastStore'
import { authApi } from '../shared/api/authApi'
import { hydrateMine } from '../shared/api/hydrateMine'

/* Email + password / Google sign-in / register screen. On success the guest's
   local saved set is merged into the server (saved_places) and the reconciled
   set replaces the local store, so saves persist cross-device. Returns the user
   to wherever they came from (location.state.from) or Explore. */
type Mode = 'login' | 'register'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/explore'

  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle)
  const busy = useAuthStore((s) => s.busy)
  const user = useAuthStore((s) => s.user)
  const showToast = useToastStore((s) => s.show)

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({})
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

  // inline, per-field validation messages (shown once a field is touched)
  const emailErr = email && !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.' : null
  const minPw = mode === 'register' ? 8 : 1
  const pwErr =
    password.length > 0 && password.length < minPw
      ? `Password must be at least ${minPw} characters.`
      : null

  // shared post-auth wiring: merge guest saves, hydrate server state, route home
  const finish = async (welcome: string) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      try {
        const merged = await authApi.mergeSaved(token, useSavedStore.getState().ids)
        useSavedStore.getState().replace(merged)
      } catch {
        /* non-fatal — local saves stay intact */
      }
    }
    void hydrateMine() // load server-backed PENDING submissions / reports
    showToast(welcome)
    navigate(from)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setTouched({ email: true, password: true })
    if (!email.trim() || !EMAIL_RE.test(email.trim()) || password.length < minPw) {
      setError('Check the highlighted fields and try again.')
      return
    }
    try {
      if (mode === 'register') {
        await register({ email: email.trim(), password, name: name.trim() || undefined })
      } else {
        await login({ email: email.trim(), password })
      }
      await finish(mode === 'register' ? 'Account created — welcome' : 'Signed in')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const onGoogle = async (idToken: string) => {
    setError(null)
    try {
      await loginWithGoogle(idToken)
      await finish('Signed in with Google')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    }
  }

  return (
    <AppShell>
      <div className="fg-page">
        <div className="fg-page-in fg-auth" style={{ maxWidth: 460 }}>
          <div className="fg-page-h">
            <div>
              <span className="kicker">Field guide access</span>
              <h1>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
              <div className="sub">
                Saving spots and contributing need an account. Browsing is open to everyone.
              </div>
            </div>
          </div>

          <GoogleButton onCredential={onGoogle} disabled={busy} />

          <div className="fg-social">
            <button type="button" className="fg-social-btn" disabled aria-disabled
              title="Facebook login is in test mode — pending Meta app review for the email scope.">
              <span aria-hidden style={{ fontWeight: 700, color: '#1877F2' }}>f</span> Continue with Facebook
            </button>
            <div className="hint">Facebook is in test mode (pending app review).</div>
          </div>

          <div className="fg-or"><span>or use email</span></div>

          <form className="fg-form" onSubmit={submit} noValidate>
            {mode === 'register' && (
              <div className="fg-field">
                <label htmlFor="auth-name">Name <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input id="auth-name" type="text" value={name} autoComplete="name"
                  placeholder="How should we credit you?" onChange={(e) => setName(e.target.value)} />
              </div>
            )}

            <div className="fg-field" data-err={!!(touched.email && emailErr)}>
              <label htmlFor="auth-email">Email</label>
              <input id="auth-email" type="email" value={email} autoComplete="email"
                placeholder="you@example.com"
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                onChange={(e) => setEmail(e.target.value)} />
              {touched.email && emailErr && <div className="err">{emailErr}</div>}
            </div>

            <div className="fg-field" data-err={!!(touched.password && pwErr)}>
              <label htmlFor="auth-password">Password</label>
              <div className="fg-pw">
                <input id="auth-password" type={showPw ? 'text' : 'password'} value={password}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="fg-pw-toggle" onClick={() => setShowPw((v) => !v)}
                  aria-pressed={showPw} aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
              {touched.password && pwErr && <div className="err">{pwErr}</div>}
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

          <div className="fg-auth-guest">
            <button type="button" className="fg-linkbtn" onClick={() => navigate(from)}>
              Continue as guest — keep browsing
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
