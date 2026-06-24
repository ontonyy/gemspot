import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import { Button } from '../shared/ui/Button'
import { useAuthStore } from '../shared/store/authStore'

/* Landing for the email-change verification link
   (<web-url>/#/account/verify-email?token=…). Consumes the token once on mount:
   the server swaps the email and revokes all sessions, so on success we send the
   user to /auth to sign in with the new address. Public route — no session needed
   (the token is the bearer of authority). */

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const verifyEmailChange = useAuthStore((s) => s.verifyEmailChange)
  const token = params.get('token') ?? ''
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working')
  const [message, setMessage] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return // StrictMode double-invoke guard — consume once
    ran.current = true
    if (!token) {
      setStatus('error')
      setMessage('This verification link is missing its token.')
      return
    }
    verifyEmailChange(token)
      .then(() => setStatus('done'))
      .catch((err) => {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Could not verify this link.')
      })
  }, [token, verifyEmailChange])

  return (
    <AppShell>
      <div className="fg-page">
        <div className="fg-page-in" style={{ maxWidth: 520 }}>
          <div className="fg-page-h">
            <div>
              <span className="kicker">Account</span>
              <h1>Email verification</h1>
            </div>
          </div>
          <section className="fg-acct-sec">
            {status === 'working' && <div className="fg-acct-meta">Verifying your new email…</div>}
            {status === 'done' && (
              <>
                <div className="fg-acct-meta">
                  Your email has been updated. For security, all sessions were signed out — please
                  sign in again with your new email.
                </div>
                <div className="fg-form-actions">
                  <Button variant="solid" onClick={() => navigate('/auth', { replace: true })}>
                    Go to sign in
                  </Button>
                </div>
              </>
            )}
            {status === 'error' && (
              <>
                <div className="fg-acct-warn">{message}</div>
                <div className="fg-form-actions">
                  <Button onClick={() => navigate('/account', { replace: true })}>
                    Back to settings
                  </Button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  )
}
