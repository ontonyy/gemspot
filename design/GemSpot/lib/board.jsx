/* GemSpot — per-direction style board: palette, type, marker family, map. */

const DIR_MOOD = {
  A: 'Warm, friendly, semi-illustrated. A city discovery app that feels like a local friend showing you around.',
  B: 'Calm, curated, magazine-like. Restrained palette, serif voice, photography-led — a boutique guide to the city.',
  C: 'Cool, crisp, confident. Clean geo-product clarity with expressive branded markers and accents. The MVP pick.',
};
const DIR_BEST = {
  A: ['Best for consumer warmth + memorability', 'Watch: keep it from tipping childish', 'Medium build effort'],
  B: ['Best for curation, scenic + seasonal spots', 'Watch: heavy on photography supply', 'Medium–high build effort'],
  C: ['Best for MVP speed + map clarity', 'Strong brand without harming the task', 'Lowest build effort — recommended'],
};

function Swatch({ c, label, ink }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start' }}>
      <div style={{ width: 46, height: 46, borderRadius: 10, background: c, border: '1px solid rgba(0,0,0,0.08)' }} />
      <span style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', color: ink, opacity: 0.7 }}>{label}</span>
    </div>
  );
}

function BoardLabel({ children, ink }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: ink, opacity: 0.55, marginBottom: 12 }}>{children}</div>;
}

function StyleBoard({ D }) {
  const ink = D.color.ink;
  return (
    <div style={{ width: '100%', height: '100%', background: D.color.bg, padding: '30px 30px 26px', boxSizing: 'border-box',
      fontFamily: D.font.body, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* header */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: D.color.accent, color: D.color.accentInk || '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: D.font.head, fontSize: 30, fontWeight: 700, flex: '0 0 auto' }}>{D.key}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: D.font.head, fontSize: 25, fontWeight: D.key === 'B' ? 500 : 700, color: ink, letterSpacing: '-0.01em', lineHeight: 1.05 }}>{D.name}</div>
          <div style={{ fontSize: 13, color: D.color.inkSoft, lineHeight: 1.45, marginTop: 7, maxWidth: 420 }}>{DIR_MOOD[D.key]}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 26 }}>
        {/* left column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* palette */}
          <div>
            <BoardLabel ink={ink}>Palette</BoardLabel>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Swatch c={D.color.bg} label="bg" ink={ink} />
              <Swatch c={D.color.surface} label="surface" ink={ink} />
              <Swatch c={D.color.ink} label="ink" ink={ink} />
              <Swatch c={D.color.accent} label="accent" ink={ink} />
              <Swatch c={D.color.accent2} label="accent2" ink={ink} />
            </div>
          </div>
          {/* type */}
          <div>
            <BoardLabel ink={ink}>Typography</BoardLabel>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <span style={{ fontFamily: D.font.head, fontSize: 52, fontWeight: D.key === 'B' ? 500 : 700, color: ink, lineHeight: 0.9 }}>Aa</span>
              <div>
                <div style={{ fontFamily: D.font.head, fontSize: 18, fontWeight: D.key === 'B' ? 500 : 700, color: ink, lineHeight: 1.1 }}>Hidden gems, spotted by locals</div>
                <div style={{ fontFamily: D.font.body, fontSize: 12.5, color: D.color.inkSoft, marginTop: 5, lineHeight: 1.4 }}>Find courts, viewpoints & seasonal spots across Tallinn.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 10, fontFamily: 'ui-monospace, monospace', color: ink, opacity: 0.55 }}>
              <span>Display · {D.font.head.split(',')[0].replace(/"/g, '')}</span>
              <span>Body · {D.font.body.split(',')[0].replace(/"/g, '')}</span>
            </div>
          </div>
          {/* tradeoffs */}
          <div>
            <BoardLabel ink={ink}>Where it fits</BoardLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {DIR_BEST[D.key].map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: D.color.inkSoft, fontWeight: 500 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: D.color.accent, flex: '0 0 auto' }} />{b}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right column */}
        <div style={{ width: 224, flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* map swatch */}
          <div>
            <BoardLabel ink={ink}>Map style</BoardLabel>
            <div style={{ width: '100%', height: 132, borderRadius: 14, overflow: 'hidden', position: 'relative', border: `1px solid ${D.color.line}` }}>
              <TallinnMap theme={D.map} showLabels={false} />
              <div style={{ position: 'absolute', left: '40%', top: '46%', transform: 'translate(-50%,-100%)' }}>
                <GemMarker cat="scenic" color={gemCatColor(D, 'scenic')} variant={D.marker} size={26} />
              </div>
              <div style={{ position: 'absolute', left: '62%', top: '60%', transform: 'translate(-50%,-100%)' }}>
                <GemMarker cat="sakura" color={gemCatColor(D, 'sakura')} variant={D.marker} size={26} />
              </div>
            </div>
          </div>
          {/* markers */}
          <div>
            <BoardLabel ink={ink}>Marker family</BoardLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
              {GEM_CATEGORIES.map((c) => (
                <GemMarker key={c.id} cat={c.id} color={gemCatColor(D, c.id)} variant={D.marker} size={30} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginTop: 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <GemMarker cat="basketball" color={gemCatColor(D, 'basketball')} variant={D.marker} size={28} />
                <span style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', color: ink, opacity: 0.55 }}>default</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <GemMarker cat="basketball" color={gemCatColor(D, 'basketball')} variant={D.marker} size={28} state="selected" />
                <span style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', color: ink, opacity: 0.55 }}>selected</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <GemMarker cat="basketball" color={gemCatColor(D, 'basketball')} variant={D.marker} size={28} saved />
                <span style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', color: ink, opacity: 0.55 }}>saved</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StyleBoard, DIR_MOOD, DIR_BEST });
