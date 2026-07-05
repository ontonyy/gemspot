import { AppShell } from '../../app/AppShell'
import { Button } from '../../shared/ui/Button'
import { Icon, Ic } from '../../shared/ui/Icon'
import { usePageTitle } from '../../shared/lib/pageTitle'

/* Bring GemSpot to your city — short pitch + contact CTA (mailto for now). */

export default function BringToYourCity() {
  usePageTitle('Bring GemSpot to your city')
  return (
    <AppShell>
      <div className="fg-page">
        <div className="fg-page-in fg-static">
          <div className="fg-page-h">
            <div>
              <div className="kicker">Beyond Tallinn</div>
              <h1>Bring GemSpot to your city</h1>
              <div className="sub">Every city has hidden gems. They just need a map.</div>
            </div>
          </div>

          <section className="fg-static-sec">
            <p>
              GemSpot started in Tallinn, but nothing about it is Tallinn-only. The
              recipe is simple: a handful of locals who know their city, a reviewer who
              keeps the map honest, and a few dozen genuinely good spots to seed it.
            </p>
            <p>
              If that sounds like you and your city, we'd love to talk. You don't need
              to be technical — you need to know where the good sunsets are.
            </p>
          </section>

          <section className="fg-static-sec">
            <h2>What a city launch needs</h2>
            <p>
              Two or three founding spotters, roughly 30–50 seed spots across a few
              categories, and one person willing to review submissions. We handle the
              map, the platform and everything else.
            </p>
            <div className="fg-static-cta">
              <Button variant="solid" onClick={() => { window.location.href = 'mailto:hello@gemspot.app?subject=Bring%20GemSpot%20to%20my%20city' }}>
                <Icon d={Ic.arrow} size={15} sw={2} />Pitch us your city
              </Button>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
