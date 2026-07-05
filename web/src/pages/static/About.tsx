import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../app/AppShell'
import { Button } from '../../shared/ui/Button'
import { Icon, Ic } from '../../shared/ui/Icon'
import { usePageTitle } from '../../shared/lib/pageTitle'

/* About — short editorial page sharing the fg-page scaffold (Saved/Guides/Add). */

export default function About() {
  usePageTitle('About')
  const navigate = useNavigate()
  return (
    <AppShell>
      <div className="fg-page">
        <div className="fg-page-in fg-static">
          <div className="fg-page-h">
            <div>
              <div className="kicker">GemSpot</div>
              <h1>About</h1>
              <div className="sub">A field guide to Tallinn's hidden gems.</div>
            </div>
          </div>

          <section className="fg-static-sec">
            <p>
              GemSpot is a local discovery map for Tallinn. It collects the places that
              don't show up in guidebooks — scenic viewpoints, seasonal blossoms, quiet
              swim spots, pickup courts — pinned by the people who actually use them.
            </p>
            <p>
              It's a discovery tool, not a navigation app. Every spot is submitted by a
              local and checked by a reviewer before it lands on the map, so the map
              stays small, honest and worth browsing.
            </p>
          </section>

          <section className="fg-static-sec">
            <h2>How the map stays good</h2>
            <p>
              Anyone can add a spot. A reviewer verifies each submission — is it real,
              is it free to visit, is the pin in the right place — before it's
              published. If a spot closes or moves, anyone can report it from its
              detail page.
            </p>
          </section>

          <section className="fg-static-sec">
            <h2>Get in touch</h2>
            <p>
              Questions, corrections or ideas — write to{' '}
              <a href="mailto:hello@gemspot.app">hello@gemspot.app</a>.
            </p>
            <div className="fg-static-cta">
              <Button variant="solid" onClick={() => navigate('/explore')}>
                <Icon d={Ic.pin} size={16} sw={1.8} />Explore the map
              </Button>
              <Button onClick={() => navigate('/add')}>
                <Icon d={Ic.plus} size={15} sw={2} />Add a spot
              </Button>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
