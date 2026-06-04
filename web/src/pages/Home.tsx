import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import { Button } from '../shared/ui/Button'
import { Icon, Ic } from '../shared/ui/Icon'
import { catColor, CategoryGlyph, FG_CATS } from '../entities/place/categories'

/* Landing / home — the front door. Sets the "Spotter's Field Guide" frame,
   then sends people into the map. Map-first product: every CTA leads to Explore.
   Wrapped in AppShell so the top nav + search stay consistent. */
export default function Home() {
  const navigate = useNavigate()
  return (
    <AppShell>
      <div className="fg-home">
        <div className="fg-home-in">
          <section className="fg-home-hero">
            <span className="kicker">Tallinn · Spotter's Field Guide</span>
            <h1>Find the city's<br />open-air spots.</h1>
            <p>
              A field guide to Tallinn's outdoor courts, pitches, viewpoints and
              cherry blossoms — mapped, saved, and added by the people who play there.
            </p>
            <div className="fg-home-cta">
              <Button variant="solid" onClick={() => navigate('/explore')}>
                <Icon d={Ic.pin} size={16} sw={2} />Explore the map
              </Button>
              <Button onClick={() => navigate('/add')}>
                <Icon d={Ic.plus} size={16} sw={2} />Add a spot
              </Button>
            </div>
            <div className="fg-home-stats mono">
              <span><b>10</b> spots</span><span className="dot" />
              <span><b>7</b> categories</span><span className="dot" />
              <span><b>free</b> to browse</span>
            </div>
          </section>

          <section className="fg-home-cats">
            <div className="kicker">Browse by category</div>
            <div className="fg-home-catgrid">
              {FG_CATS.map((c) => (
                <button key={c.id} className="fg-home-cat"
                  style={{ '--cc': catColor(c.id) } as CSSProperties}
                  onClick={() => navigate(`/explore?cat=${c.id}`)}>
                  <span className="fg-home-cat-ic" style={{ background: catColor(c.id) }}>
                    <CategoryGlyph cat={c.id} size={18} />
                  </span>
                  {c.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
