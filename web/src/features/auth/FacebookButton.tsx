import { useEffect, useRef, useState } from 'react'

/* "Continue with Facebook" — Facebook JS SDK login flow. Loads the SDK once,
   initializes with VITE_FACEBOOK_APP_ID, and on click runs FB.login with the
   `email` scope; the returned user access token is handed up to onCredential,
   which exchanges it at the backend (POST /auth/oauth/facebook) for our session.

   When VITE_FACEBOOK_APP_ID is unset, renders the disabled "test mode"
   placeholder instead of a flow that can't complete — same restraint as
   GoogleButton. Facebook stays in test mode until Meta App Review approves the
   email scope (see docs/auth-providers-setup.md). */

type Fb = {
  init: (cfg: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void
  login: (
    cb: (r: { authResponse?: { accessToken?: string } | null; status?: string }) => void,
    opts: { scope: string },
  ) => void
}
declare global {
  interface Window {
    FB?: Fb
    fbAsyncInit?: () => void
  }
}

const APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined
const SRC = 'https://connect.facebook.net/en_US/sdk.js'
const VERSION = 'v21.0'

function loadFb(appId: string): Promise<Fb | null> {
  return new Promise((resolve) => {
    if (window.FB) return resolve(window.FB)
    const init = () => {
      window.FB?.init({ appId, cookie: true, xfbml: false, version: VERSION })
      resolve(window.FB ?? null)
    }
    const existing = document.querySelector(`script[src="${SRC}"]`)
    if (existing) {
      if (window.FB) return resolve(window.FB)
      existing.addEventListener('load', init, { once: true })
      return
    }
    window.fbAsyncInit = init
    const s = document.createElement('script')
    s.src = SRC
    s.async = true
    s.defer = true
    s.crossOrigin = 'anonymous'
    s.addEventListener('error', () => resolve(null), { once: true })
    document.head.appendChild(s)
  })
}

export function FacebookButton({
  onCredential,
  disabled,
}: {
  onCredential: (accessToken: string) => void
  disabled?: boolean
}) {
  const fb = useRef<Fb | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!APP_ID) return
    let cancelled = false
    void loadFb(APP_ID).then((sdk) => {
      if (!cancelled) fb.current = sdk
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Unset env → disabled "test mode" placeholder (default until configured).
  if (!APP_ID) {
    return (
      <div className="fg-social">
        <button type="button" className="fg-social-btn" disabled aria-disabled
          title="Facebook login is in test mode — pending Meta app review for the email scope.">
          <FacebookGlyph /> Continue with Facebook
        </button>
        <div className="hint">Facebook is in test mode (pending app review).</div>
      </div>
    )
  }

  const onClick = () => {
    const sdk = fb.current
    if (!sdk) return
    setLoading(true)
    sdk.login(
      (r) => {
        setLoading(false)
        const token = r?.authResponse?.accessToken
        if (token) onCredential(token)
      },
      { scope: 'email' },
    )
  }

  return (
    <div className="fg-social">
      <button type="button" className="fg-social-btn" onClick={onClick}
        disabled={disabled || loading} aria-disabled={disabled || loading}>
        <FacebookGlyph /> Continue with Facebook
      </button>
    </div>
  )
}

function FacebookGlyph() {
  return <span aria-hidden style={{ fontWeight: 700, color: '#1877F2' }}>f</span>
}
