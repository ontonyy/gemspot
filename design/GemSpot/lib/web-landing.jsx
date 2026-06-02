/* GemSpot Web — public marketing / SEO landing page (logged-out home). */

// Category-tinted placeholder imagery (offline-safe; real photos slot in here).
function Photo({ cat, h = 160, label, round = 'var(--r-card)', flat = false }) {
  const col = cat ? catColor(cat) : C.color.accent;
  return (
    <div className="gs-photo" style={{ height: h, borderRadius: flat ? 0 : round, '--pc': col }}>
      <div className="gs-photo-wm">{cat && <GemGlyph cat={cat} size={Math.min(h * 0.4, 78)} color="#fff" />}</div>
      {label && <span className="gs-photo-label">{label}</span>}
    </div>
  );
}

function Landing() {
  const { go, spots } = useApp();
  const featured = ['s6', 's3', 's8', 's5'].map((id) => spots.find((s) => s.id === id));
  const stats = [
    { n: '320+', l: 'curated spots' },
    { n: '7', l: 'categories' },
    { n: '100%', l: 'locally spotted' },
  ];
  const steps = [
    { ic: 'compass', t: 'Discover', d: 'Browse the map by what you feel like — a sunset, a pickup game, a quiet table.' },
    { ic: 'bookmark', t: 'Save', d: 'Keep the gems you love in one list and pull up directions when you head out.' },
    { ic: 'plus', t: 'Add', d: 'Spotted something worth sharing? Add it — a local reviewer checks every pin.' },
  ];
  return (
    <div className="gs-landing">
      {/* HERO */}
      <section className="gs-hero">
        <div className="gs-hero-copy">
          <span className="gs-eyebrow">Tallinn · local discovery</span>
          <h1>Hidden city gems, spotted by locals.</h1>
          <p>Find scenic viewpoints, seasonal blossoms and places to play — on a map built for discovery, not directions.</p>
          <div className="gs-hero-cta">
            <button className="gs-btn gs-btn-primary gs-btn-lg" onClick={() => go('explore')}>Explore the map</button>
            <button className="gs-btn gs-btn-ghost gs-btn-lg" onClick={() => go('add')}>Add a spot</button>
          </div>
          <div className="gs-hero-stats">
            {stats.map((s) => <div key={s.l}><b>{s.n}</b><span>{s.l}</span></div>)}
          </div>
        </div>
        <div className="gs-hero-map" onClick={() => go('explore')}>
          <WebMap spots={spots} cluster controls={false} showMe={false} onSelectSpot={() => go('explore')} />
          <div className="gs-hero-map-cta"><UIcon name="compass" size={16} stroke="#fff" /> Open the live map</div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="gs-section">
        <div className="gs-section-head">
          <h2>Find your kind of spot</h2>
          <p>Seven categories, each its own colour and marker on the map.</p>
        </div>
        <div className="gs-cat-grid">
          {GEM_CATEGORIES.map((c) => (
            <button key={c.id} className="gs-cat-card" style={{ '--pc': catColor(c.id) }}
              onClick={() => { go('explore'); }}>
              <span className="gs-cat-ic"><GemGlyph cat={c.id} size={22} color="#fff" /></span>
              <span className="gs-cat-name">{c.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="gs-section">
        <div className="gs-section-head gs-section-head-row">
          <div>
            <h2>Spotted this week</h2>
            <p>A few favourites from the GemSpot community.</p>
          </div>
          <button className="gs-link" onClick={() => go('explore')}>See all on the map →</button>
        </div>
        <div className="gs-featured-grid">
          {featured.map((sp) => <SpotCard key={sp.id} sp={sp} variant="featured" />)}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="gs-section gs-how">
        <div className="gs-section-head"><h2>How GemSpot works</h2></div>
        <div className="gs-how-grid">
          {steps.map((s, i) => (
            <div key={s.t} className="gs-how-step">
              <span className="gs-how-num">{i + 1}</span>
              <span className="gs-how-ic"><UIcon name={s.ic} size={22} stroke={C.color.accent} /></span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BAND */}
      <section className="gs-cta-band">
        <div>
          <h2>Know a spot we're missing?</h2>
          <p>Put it on the map for the rest of Tallinn.</p>
        </div>
        <button className="gs-btn gs-btn-primary gs-btn-lg" onClick={() => go('add')}>Add a spot</button>
      </section>

      {/* FOOTER */}
      <footer className="gs-footer">
        <div className="gs-footer-top">
          <Logo size={28} />
          <div className="gs-footer-cols">
            <div><h4>Explore</h4><a onClick={() => go('explore')}>The map</a><a onClick={() => go('explore')}>Categories</a><a onClick={() => go('saved')}>Saved spots</a></div>
            <div><h4>Contribute</h4><a onClick={() => go('add')}>Add a spot</a><a onClick={() => go('add')}>Report an issue</a></div>
            <div><h4>GemSpot</h4><a>About</a><a>Bring GemSpot to your city</a><a>Privacy</a></div>
          </div>
        </div>
        <div className="gs-footer-bot">
          <span>© 2026 GemSpot · Made in Tallinn</span>
          <span>A local discovery map, not a navigation app.</span>
        </div>
      </footer>
    </div>
  );
}

Object.assign(window, { Photo, Landing });
