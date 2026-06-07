import { useEffect, useRef } from 'react'

/* "Continue with Google" — Google Identity Services (OIDC) credential flow.
   Loads the GSI client once, renders Google's official button, and hands the
   returned ID token (JWT) up to onCredential, which exchanges it at the backend
   (POST /auth/oauth/google) for our own session.

   Configured via VITE_GOOGLE_CLIENT_ID. When unset, renders a disabled button
   with an honest note rather than a flow that can't complete — same restraint
   as the rest of the app (we don't promise what isn't wired). */

type GsiId = {
  initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void
}
declare global {
  interface Window {
    google?: { accounts?: { id?: GsiId } }
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const SRC = 'https://accounts.google.com/gsi/client'

function loadGsi(): Promise<GsiId | null> {
  return new Promise((resolve) => {
    if (window.google?.accounts?.id) return resolve(window.google.accounts.id)
    const existing = document.querySelector(`script[src="${SRC}"]`)
    const onReady = () => resolve(window.google?.accounts?.id ?? null)
    if (existing) {
      existing.addEventListener('load', onReady, { once: true })
      return
    }
    const s = document.createElement('script')
    s.src = SRC
    s.async = true
    s.defer = true
    s.addEventListener('load', onReady, { once: true })
    s.addEventListener('error', () => resolve(null), { once: true })
    document.head.appendChild(s)
  })
}

export function GoogleButton({
  onCredential,
  disabled,
}: {
  onCredential: (idToken: string) => void
  disabled?: boolean
}) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!CLIENT_ID || !host.current) return
    let cancelled = false
    void loadGsi().then((id) => {
      if (cancelled || !id || !host.current) return
      id.initialize({
        client_id: CLIENT_ID,
        callback: (r) => r.credential && onCredential(r.credential),
      })
      host.current.replaceChildren()
      id.renderButton(host.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: 320,
      })
    })
    return () => {
      cancelled = true
    }
  }, [onCredential])

  if (!CLIENT_ID) {
    return (
      <div className="fg-social">
        <button type="button" className="fg-social-btn" disabled aria-disabled>
          <GoogleGlyph /> Continue with Google
        </button>
        <div className="hint">Google sign-in isn’t configured in this build.</div>
      </div>
    )
  }
  return (
    <div className="fg-social">
      <div ref={host} style={{ minHeight: 40, opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }} />
    </div>
  )
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}
