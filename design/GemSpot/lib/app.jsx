/* GemSpot — intro & recommendation board + canvas assembly. */

const INK = '#1c2230', INKSOFT = '#5a6473', LINE = '#e6e3da', ACC = '#2f6fe0';
const HEAD = '"Space Grotesk", system-ui, sans-serif', BODY = '"Hanken Grotesk", system-ui, sans-serif';

function IntroBoard() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#fbfaf7', padding: '34px 38px', boxSizing: 'border-box', fontFamily: BODY, color: INK, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: ACC, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GemGlyph cat="scenic" size={20} color="#fff" />
        </div>
        <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>GemSpot</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#9aa0ab', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Design directions · mobile</span>
      </div>
      <div style={{ fontFamily: HEAD, fontSize: 33, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.04, maxWidth: 620 }}>Three directions for the Tallinn explore app</div>
      <div style={{ fontSize: 14.5, color: INKSOFT, lineHeight: 1.5, maxWidth: 640, marginTop: 12 }}>
        Same product, three personalities — each shown as a style board plus a run of mobile screens
        (explore → filter → preview → detail → add a spot → saved). Pan and zoom; click any frame to focus.
        Reorder or delete frames as you react.
      </div>

      <div style={{ display: 'flex', gap: 34, marginTop: 26, flex: 1 }}>
        {/* shared system */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9aa0ab', marginBottom: 14 }}>Shared system across all three</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: '16px 14px', justifyContent: 'start', marginBottom: 20 }}>
            {GEM_CATEGORIES.map((c) => (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 64 }}>
                <GemMarker cat={c.id} color={DIR_C.cat[c.id]} variant="clean" size={30} />
                <span style={{ fontSize: 10.5, fontWeight: 600, color: INKSOFT, textAlign: 'center', lineHeight: 1.1 }}>{c.short}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              ['7 categories', 'courts, viewpoints & seasonal sakura'],
              ['Round “ball” markers', 'recognizable by colour + glyph, 3 states'],
              ['Custom Tallinn map', 'bay, Old Town, Kadriorg, Snelli pond — restyled per direction'],
              ['Voice', '“hidden gems, spotted by locals”'],
            ].map(([t, d]) => (
              <div key={t} style={{ display: 'flex', gap: 9, alignItems: 'baseline' }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: ACC, flex: '0 0 auto', transform: 'translateY(-1px)' }} />
                <span style={{ fontSize: 13, color: INKSOFT, lineHeight: 1.35 }}><b style={{ color: INK }}>{t}</b> — {d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* directions + recommendation */}
        <div style={{ width: 300, flex: '0 0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9aa0ab', marginBottom: 14 }}>The three directions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { k: 'A', n: 'Playful city guide', d: 'Warm, friendly, image-led', c: '#ef7a45' },
              { k: 'B', n: 'Editorial companion', d: 'Calm, curated, magazine-like', c: '#b5603a' },
              { k: 'C', n: 'Clean geo + accents', d: 'Crisp, branded, fast to ship', c: '#2f6fe0', rec: true },
            ].map((x) => (
              <div key={x.k} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 13px', borderRadius: 12, background: '#fff', border: `1px solid ${x.rec ? x.c : LINE}`, boxShadow: x.rec ? `0 4px 14px ${x.c}22` : 'none', position: 'relative' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: x.c, color: '#fff', fontFamily: HEAD, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{x.k}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: HEAD, fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em' }}>{x.n}</div>
                  <div style={{ fontSize: 11.5, color: INKSOFT, marginTop: 1 }}>{x.d}</div>
                </div>
                {x.rec && <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', color: x.c, background: `${x.c}15`, padding: '4px 7px', borderRadius: 100 }}>PICK</span>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, fontSize: 11.5, color: '#9aa0ab', lineHeight: 1.45 }}>
            <b style={{ color: INKSOFT }}>Mocked:</b> map is hand-built SVG (no live tiles); photos are placeholders.
            <br /><b style={{ color: INKSOFT }}>Next:</b> desktop split-view + admin / moderation.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Canvas ──────────────────────────────────────────────────────────────────
const SCREENS = [
  ['explore', 'Explore', ScreenExplore],
  ['filter', 'Category filter', ScreenFilter],
  ['preview', 'Place preview', ScreenPreview],
  ['detail', 'Place detail', ScreenDetail],
  ['add', 'Add a spot', ScreenAdd],
  ['saved', 'Saved spots', ScreenSaved],
];

function DirectionSection({ D }) {
  return (
    <DCSection id={`dir-${D.key}`} title={`${D.key} · ${D.name}`} subtitle={DIR_MOOD[D.key]}>
      <DCArtboard id={`${D.key}-board`} label="Style board" width={560} height={690} style={{ borderRadius: 18 }}>
        <StyleBoard D={D} />
      </DCArtboard>
      {SCREENS.map(([id, label, Comp]) => (
        <DCArtboard key={id} id={`${D.key}-${id}`} label={label} width={GEM_W} height={GEM_H} style={{ borderRadius: 30, fontFamily: D.font.body }}>
          <Comp D={D} />
        </DCArtboard>
      ))}
    </DCSection>
  );
}

function App() {
  return (
    <DesignCanvas>
      <DCSection id="overview" title="GemSpot · overview" subtitle="Read me first — approach, shared system & recommendation">
        <DCArtboard id="intro" label="Overview & recommendation" width={720} height={560} style={{ borderRadius: 18 }}>
          <IntroBoard />
        </DCArtboard>
      </DCSection>
      <DirectionSection D={DIR_A} />
      <DirectionSection D={DIR_B} />
      <DirectionSection D={DIR_C} />
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
