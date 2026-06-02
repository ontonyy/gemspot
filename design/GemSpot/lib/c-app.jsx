/* GemSpot — Direction C, saved as the chosen MVP direction.
   Renders only Direction C: style board + the six mobile screens. */

function DirectionCBoard() {
  const D = DIR_C;
  return (
    <div style={{ width: '100%', height: '100%', background: '#fbfaf7', padding: '34px 38px', boxSizing: 'border-box', fontFamily: '"Hanken Grotesk", system-ui, sans-serif', color: '#19202b', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: D.color.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GemGlyph cat="scenic" size={20} color="#fff" />
        </div>
        <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>GemSpot</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: D.color.accent, background: `${D.color.accent}14`, padding: '4px 9px', borderRadius: 100, letterSpacing: '0.06em' }}>SAVED · MVP DIRECTION</span>
      </div>
      <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.05, maxWidth: 560 }}>Direction C — Clean geo + playful accents</div>
      <div style={{ fontSize: 14, color: D.color.inkSoft, lineHeight: 1.5, maxWidth: 560, marginTop: 12 }}>
        {DIR_MOOD.C} Below: the style board followed by the six MVP flows
        (explore → filter → preview → detail → add a spot → saved).
      </div>
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9aa0ab', marginBottom: 14 }}>7 categories</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, auto)', gap: '16px 14px', justifyContent: 'start' }}>
          {GEM_CATEGORIES.map((c) => (
            <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 64 }}>
              <GemMarker cat={c.id} color={DIR_C.cat[c.id]} variant="clean" size={30} />
              <span style={{ fontSize: 10.5, fontWeight: 600, color: D.color.inkSoft, textAlign: 'center', lineHeight: 1.1 }}>{c.short}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const C_SCREENS = [
  ['explore', 'Explore', ScreenExplore],
  ['filter', 'Category filter', ScreenFilter],
  ['preview', 'Place preview', ScreenPreview],
  ['detail', 'Place detail', ScreenDetail],
  ['add', 'Add a spot', ScreenAdd],
  ['saved', 'Saved spots', ScreenSaved],
];

function AppC() {
  const D = DIR_C;
  return (
    <DesignCanvas>
      <DCSection id="c-overview" title="GemSpot · Direction C (saved)" subtitle="The chosen MVP direction — clean geo-product clarity, branded markers">
        <DCArtboard id="c-intro" label="Direction C — saved" width={680} height={460} style={{ borderRadius: 18 }}>
          <DirectionCBoard />
        </DCArtboard>
        <DCArtboard id="c-styleboard" label="Style board" width={560} height={690} style={{ borderRadius: 18 }}>
          <StyleBoard D={D} />
        </DCArtboard>
      </DCSection>
      <DCSection id="c-screens" title="Direction C · MVP screens" subtitle="explore → filter → preview → detail → add → saved">
        {C_SCREENS.map(([id, label, Comp]) => (
          <DCArtboard key={id} id={`c-${id}`} label={label} width={GEM_W} height={GEM_H} style={{ borderRadius: 30, fontFamily: D.font.body }}>
            <Comp D={D} />
          </DCArtboard>
        ))}
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<AppC />);
