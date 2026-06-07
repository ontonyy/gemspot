import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import { Button } from '../shared/ui/Button'
import { Icon, Ic } from '../shared/ui/Icon'
import { catColor, CategoryGlyph, FG_CATS } from '../entities/place/categories'
import { useExploreList } from '../features/explore/useExploreList'
import { RailCard } from '../features/explore/RailCard'
import { useGatedSave } from '../shared/store/useGatedSave'
import { HeroMapCanvas } from '../widgets/map/HeroMapCanvas'

/* Landing / home — the editorial front door, ported from the "Spotter's Field
   Guide" design at full fidelity: hero + live-map preview, taxonomy grid,
   spotted-this-week, how-it-works, contribute band, footer. Map-first product:
   every CTA leads into Explore / Add. Wrapped in AppShell so the top nav +
   search (desktop) and bottom-nav (mobile) stay consistent. */

const STEPS = [
  { n: '01', ic: Ic.loc, t: 'Discover', d: "Browse the map by what you feel like — a sunset, a pickup game, a quiet table." },
  { n: '02', ic: Ic.book, t: 'Save', d: 'Keep the gems you love in one list and pull up directions when you head out.' },
  { n: '03', ic: Ic.plus, t: 'Add', d: 'Spotted something worth sharing? Add it — a local reviewer checks every pin.' },
]

/* Project real lat/lng onto the static hero canvas (0–100%), padded to the
   8–92% band so pins never sit on the frame. Decorative preview — clicking
   anywhere opens the live map. */
function projectPins(items: { lat: number; lng: number }[]) {
  if (items.length === 0) return [] as { x: number; y: number }[]
  const lats = items.map((p) => p.lat)
  const lngs = items.map((p) => p.lng)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const span = (v: number, lo: number, hi: number) => (hi - lo < 1e-9 ? 0.5 : (v - lo) / (hi - lo))
  const band = (t: number) => 8 + t * 84
  return items.map((p) => ({
    x: band(span(p.lng, minLng, maxLng)),
    y: band(1 - span(p.lat, minLat, maxLat)),
  }))
}

export default function Home() {
  const navigate = useNavigate()
  const save = useGatedSave()
  const { items } = useExploreList()

  const total = items.length
  const featured = items.slice(0, 4)
  const heroSpots = items.slice(0, 7)
  const heroPins = projectPins(heroSpots)

  const stats = [
    { n: String(total || '—'), l: 'spots mapped' },
    { n: String(FG_CATS.length), l: 'categories' },
    { n: '100%', l: 'locally spotted' },
  ]

  return (
    <AppShell>
      <div className="fg-home">
        <div className="fg-home-scroll">
          {/* HERO */}
          <section className="fg-hero">
            <div className="fg-hero-copy">
              <span className="kicker">Tallinn · local discovery</span>
              <h1>Hidden city gems, spotted by locals.</h1>
              <p>
                Find scenic viewpoints, seasonal blossoms and places to play — on a map
                built for discovery, not directions.
              </p>
              <div className="fg-hero-cta">
                <Button variant="solid" size="lg" onClick={() => navigate('/explore')}>
                  <Icon d={Ic.pin} size={17} sw={1.8} />Explore the map
                </Button>
                <Button size="lg" onClick={() => navigate('/add')}>
                  <Icon d={Ic.plus} size={16} sw={2} />Add a spot
                </Button>
              </div>
              <div className="fg-hero-stats">
                {stats.map((st) => (
                  <div key={st.l}>
                    <b className="mono">{st.n}</b>
                    <span className="mono">{st.l}</span>
                  </div>
                ))}
              </div>
            </div>
            <button className="fg-hero-map" onClick={() => navigate('/explore')} aria-label="Open the live map">
              <HeroMapCanvas />
              <div className="fg-hero-pins">
                {heroSpots.map((p, i) => (
                  <span key={p.slug} className="fg-hero-pin"
                    style={{ left: heroPins[i].x + '%', top: heroPins[i].y + '%', '--pc': catColor(p.category.id) } as CSSProperties}>
                    <CategoryGlyph cat={p.category.id} size={13} />
                  </span>
                ))}
              </div>
              <span className="fg-hero-map-cta mono"><Icon d={Ic.loc} size={14} />Open the live map</span>
            </button>
          </section>

          {/* CATEGORIES */}
          <section className="fg-sec">
            <div className="fg-sec-head">
              <div className="kicker">The taxonomy</div>
              <h2>Find your kind of spot</h2>
              <p>Every category has its own ink and marker on the map.</p>
            </div>
            <div className="fg-home-cats">
              {FG_CATS.map((c) => (
                <button key={c.id} className="fg-home-cat"
                  style={{ '--cc': catColor(c.id) } as CSSProperties}
                  onClick={() => navigate(`/explore?cat=${c.id}`)}>
                  <span className="fg-home-cat-ic"><CategoryGlyph cat={c.id} size={22} /></span>
                  <span className="fg-home-cat-name">{c.label}</span>
                  <span className="fg-home-cat-go"><Icon d={Ic.arrow} size={14} sw={2} /></span>
                </button>
              ))}
            </div>
          </section>

          {/* SPOTTED THIS WEEK */}
          {featured.length > 0 && (
            <section className="fg-sec">
              <div className="fg-sec-head fg-sec-head-row">
                <div>
                  <h2>Spotted this week</h2>
                  <p>A few favourites from the GemSpot community.</p>
                </div>
                <button className="fg-link mono" onClick={() => navigate('/explore')}>
                  See all on the map<Icon d={Ic.arrow} size={13} sw={2} />
                </button>
              </div>
              <div className="fg-featured-grid">
                {featured.map((p) => (
                  <RailCard key={p.slug} p={p} no={p.id} active={false}
                    onHover={() => {}}
                    onOpen={() => navigate(`/spot/${p.slug}`)}
                    onSave={() => save(p.id)} />
                ))}
              </div>
            </section>
          )}

          {/* HOW IT WORKS */}
          <section className="fg-sec fg-how">
            <div className="fg-sec-head">
              <div className="kicker">Three steps</div>
              <h2>How GemSpot works</h2>
            </div>
            <div className="fg-how-grid">
              {STEPS.map((st) => (
                <div key={st.t} className="fg-how-step">
                  <span className="fg-how-num mono">{st.n}</span>
                  <span className="fg-how-ic"><Icon d={st.ic} size={22} /></span>
                  <h3>{st.t}</h3>
                  <p>{st.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA BAND */}
          <section className="fg-ctaband">
            <div>
              <div className="kicker" style={{ color: 'color-mix(in oklch,var(--paper) 60%,transparent)' }}>Contribute</div>
              <h2>Know a spot we're missing?</h2>
              <p>Put it on the map for the rest of Tallinn.</p>
            </div>
            <Button size="lg" className="fg-ctaband-btn" onClick={() => navigate('/add')}>
              <Icon d={Ic.plus} size={16} sw={2} />Add a spot
            </Button>
          </section>

          {/* FOOTER */}
          <footer className="fg-foot">
            <div className="fg-foot-top">
              <button className="fg-brand fg-foot-brand" onClick={() => navigate('/')} aria-label="GemSpot — home">
                <div className="fg-logo" />
                <div>
                  <div className="fg-wordmark">Gem<span>Spot</span></div>
                  <small>Tallinn · Field Guide</small>
                </div>
              </button>
              <div className="fg-foot-cols">
                <div>
                  <h4>Explore</h4>
                  <a onClick={() => navigate('/explore')}>The map</a>
                  <a onClick={() => navigate('/guides')}>Guides</a>
                  <a onClick={() => navigate('/saved')}>Saved spots</a>
                </div>
                <div>
                  <h4>Contribute</h4>
                  <a onClick={() => navigate('/add')}>Add a spot</a>
                  <a onClick={() => navigate('/add')}>Report an issue</a>
                </div>
                <div>
                  <h4>GemSpot</h4>
                  <a onClick={() => navigate('/')}>About</a>
                  <a onClick={() => navigate('/')}>Bring GemSpot to your city</a>
                  <a onClick={() => navigate('/')}>Privacy</a>
                </div>
              </div>
            </div>
            <div className="fg-foot-bot mono">
              <span>© 2026 GemSpot · Made in Tallinn</span>
              <span>A local discovery map, not a navigation app.</span>
            </div>
          </footer>
        </div>
      </div>
    </AppShell>
  )
}
