import { AppShell } from '../../app/AppShell'
import { usePageTitle } from '../../shared/lib/pageTitle'

/* Privacy — describes what the app ACTUALLY does today (verified against
   authStore.ts, savedStore.ts, track.ts, geoStore.ts). No claims of machinery
   that doesn't exist. Keep in sync with those seams if behavior changes. */

export default function Privacy() {
  usePageTitle('Privacy')
  return (
    <AppShell>
      <div className="fg-page">
        <div className="fg-page-in fg-static">
          <div className="fg-page-h">
            <div>
              <div className="kicker">GemSpot</div>
              <h1>Privacy</h1>
              <div className="sub">What we store, where, and why — in plain words.</div>
            </div>
          </div>

          <section className="fg-static-sec">
            <h2>Browsing without an account</h2>
            <p>
              You can browse the whole map signed out. Spots you save as a guest are
              kept only in your browser's local storage — they never leave your device
              and disappear if you clear your browser data.
            </p>
          </section>

          <section className="fg-static-sec">
            <h2>If you create an account</h2>
            <p>
              We store your email, display name and optional avatar, plus the spots you
              save and submit. You can sign in with email and password or via Google or
              Facebook — with those we receive only the basic profile the provider
              shares (name, email, picture). Your session tokens are kept in your
              browser's local storage so you stay signed in between visits.
            </p>
            <p>
              From your account page you can change your email or password, sign out of
              all devices, or delete your account — deletion removes your profile and
              its data from our servers.
            </p>
          </section>

          <section className="fg-static-sec">
            <h2>Location</h2>
            <p>
              Distances need a starting point. We ask the browser for your position only
              when you tap the locate control, and use it on your device to sort and
              measure distances. If you decline, we fall back to Tallinn city centre.
              Your position is not sent to our servers.
            </p>
          </section>

          <section className="fg-static-sec">
            <h2>Usage events</h2>
            <p>
              To understand what's useful we record a few product events on our own
              backend — things like "spot saved", "directions opened" or "filter
              applied", sometimes with the spot involved. No third-party analytics or
              advertising trackers run on this site.
            </p>
          </section>

          <section className="fg-static-sec">
            <h2>Questions</h2>
            <p>
              Anything unclear, or want your data removed? Write to{' '}
              <a href="mailto:hello@gemspot.app">hello@gemspot.app</a>.
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
