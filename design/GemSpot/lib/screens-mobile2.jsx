/* GemSpot — mobile screens (part 2): Place detail, Add-spot (3 patterns),
   Saved spots. */

// ── 4. Place detail (expanded) ──────────────────────────────────────────────
function ScreenDetail({ D }) {
  const sp = GEM_SPOTS[5]; // Patkuli viewpoint
  const editorial = D.cardStyle === 'editorial';
  const heroH = editorial ? 250 : 218;
  const facts = [
    { icon: 'clock', label: 'Open 24h' },
    { icon: 'location', label: sp.hood },
    { icon: 'star', label: `${sp.rating} · ${sp.saves} saves` },
  ];
  return (
    <PhoneScreen bg={D.color.surface}>
      {/* hero */}
      <div style={{ position: 'relative', height: heroH, flex: '0 0 auto' }}>
        <PhotoSlot label={`${sp.cat} · hero photo`} h={heroH} tint="#b9c2b4" dark />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,14,20,0.45) 0%, rgba(10,14,20,0) 32%, rgba(10,14,20,0) 60%, rgba(10,14,20,0.35) 100%)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}><StatusBar dark={false} /></div>
        <div style={{ position: 'absolute', top: 34, left: 14, right: 14, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ width: 40, height: 40, borderRadius: D.radius.btn, background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UIcon name="back" size={20} stroke={D.color.ink} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: D.radius.btn, background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UIcon name="share" size={19} stroke={D.color.ink} /></div>
            <div style={{ width: 40, height: 40, borderRadius: D.radius.btn, background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HeartFilled size={19} /></div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 12, left: 14, display: 'flex', gap: 6 }}>
          {[0, 1, 2].map((i) => <div key={i} style={{ width: i === 0 ? 18 : 6, height: 6, borderRadius: 3, background: i === 0 ? '#fff' : 'rgba(255,255,255,0.55)' }} />)}
        </div>
      </div>

      {/* content */}
      <div style={{
        flex: 1, background: D.color.surface, padding: editorial ? '22px 22px 0' : '18px 18px 0',
        marginTop: editorial ? 0 : -22, borderTopLeftRadius: editorial ? 0 : D.radius.sheet, borderTopRightRadius: editorial ? 0 : D.radius.sheet,
        position: 'relative', zIndex: 2, overflow: 'hidden',
      }}>
        {editorial
          ? <div style={{ textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 10.5, fontWeight: 700, color: gemCatColor(D, sp.cat), marginBottom: 9 }}>{GEM_CAT[sp.cat].label} · {sp.hood}</div>
          : <div style={{ marginBottom: 9 }}><CatBadge D={D} cat={sp.cat} size="lg" /></div>}
        <div style={{ fontFamily: D.font.head, fontSize: editorial ? 30 : 24, fontWeight: editorial ? 500 : 700, color: D.color.ink, lineHeight: 1.05, letterSpacing: '-0.015em' }}>{sp.name}</div>

        {/* attribution */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0' }}>
          <Avatar size={26} label="M" bg={D.color.accent} />
          <span style={{ fontSize: 12.5, color: D.color.inkSoft, fontWeight: 600 }}>Spotted by <b style={{ color: D.color.ink }}>Marta</b></span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#4fa86a', background: D.color.surface2, padding: '3px 8px', borderRadius: 100 }}>
            <UIcon name="check" size={12} stroke="#4fa86a" strokeWidth={2.2} /> Verified 2w ago
          </span>
        </div>

        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: D.color.inkSoft, fontFamily: D.font.body, marginBottom: 14 }}>{sp.note}</div>

        {/* quick facts */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {facts.map((f) => (
            <div key={f.label} style={{ flex: 1, background: D.color.surface2, borderRadius: D.radius.card * 0.7, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', border: D.key === 'B' ? `1px solid ${D.color.line}` : 'none' }}>
              <UIcon name={f.icon} size={17} stroke={D.color.accent} fill={f.icon === 'star' ? D.color.accent : 'none'} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: D.color.ink, textAlign: 'center' }}>{f.label}</span>
            </div>
          ))}
        </div>

        {/* photo strip */}
        <div style={{ display: 'flex', gap: 8 }}>
          {['locals', 'sunset', 'winter'].map((l) => <PhotoSlot key={l} label={l} w={88} h={62} tint="#cdd6c8" radius={D.radius.card * 0.6} style={{ flex: '0 0 auto' }} />)}
        </div>
      </div>

      {/* action bar */}
      <div style={{ flex: '0 0 auto', background: D.color.surface, borderTop: `1px solid ${D.color.line}`, padding: '10px 16px', display: 'flex', gap: 10, zIndex: 5 }}>
        <ActBtn D={D} label="Save" icon="bookmark" />
        <ActBtn D={D} label="Open route" icon="route" kind="filled" flex />
      </div>
      <HomeIndicator dark />
    </PhoneScreen>
  );
}

// ── 5. Add a spot — pattern varies by direction ─────────────────────────────
function ScreenAdd({ D }) {
  if (D.key === 'A') return <AddStepper D={D} />;
  if (D.key === 'B') return <AddPage D={D} />;
  return <AddModal D={D} />;
}

// A — friendly stepper
function AddStepper({ D }) {
  const cats = GEM_CATEGORIES;
  return (
    <PhoneScreen bg={D.color.bg}>
      <StatusBar dark />
      <div style={{ padding: '8px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 38, height: 38, borderRadius: D.radius.btn, background: D.color.surface, border: `1px solid ${D.color.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UIcon name="back" size={19} stroke={D.color.ink} /></div>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: D.color.inkFaint }}>Step 2 of 5</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: D.color.inkFaint }}>Save</span>
      </div>
      <div style={{ padding: '16px 18px 0' }}><StepDots D={D} total={5} current={1} /></div>
      <div style={{ padding: '20px 18px 0' }}>
        <div style={{ fontFamily: D.font.head, fontSize: 25, fontWeight: 700, color: D.color.ink, letterSpacing: '-0.015em', lineHeight: 1.1 }}>What kind of spot?</div>
        <div style={{ fontSize: 13.5, color: D.color.inkSoft, marginTop: 7, lineHeight: 1.4 }}>Pick a category so locals can find your gem.</div>
      </div>
      <div style={{ flex: 1, padding: '20px 18px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignContent: 'start' }}>
        {cats.slice(0, 6).map((c, i) => {
          const on = i === 5; const col = gemCatColor(D, c.id);
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px', borderRadius: D.radius.card,
              background: on ? col : D.color.surface, border: on ? `2px solid ${col}` : `2px solid ${D.color.line}`, boxShadow: on ? `0 6px 16px ${col}44` : 'none' }}>
              <span style={{ width: 34, height: 34, borderRadius: '50%', background: on ? 'rgba(255,255,255,0.25)' : col, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <GemGlyph cat={c.id} size={19} color="#fff" />
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: on ? '#fff' : D.color.ink, fontFamily: D.font.body }}>{c.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '12px 18px', display: 'flex', gap: 10 }}>
        <ActBtn D={D} label="Back" />
        <ActBtn D={D} label="Continue" kind="filled" flex icon="chevron" />
      </div>
      <HomeIndicator dark />
    </PhoneScreen>
  );
}

// B — dedicated editorial page
function AddPage({ D }) {
  const Field = ({ label, children }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.color.inkFaint, marginBottom: 9 }}>{label}</div>
      {children}
    </div>
  );
  return (
    <PhoneScreen bg={D.color.surface}>
      <StatusBar dark />
      <div style={{ padding: '8px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 38, height: 38, borderRadius: D.radius.btn, background: D.color.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UIcon name="close" size={18} stroke={D.color.ink} /></div>
      </div>
      <div style={{ flex: 1, padding: '14px 22px 0', overflow: 'hidden' }}>
        <div style={{ fontFamily: D.font.head, fontSize: 30, fontWeight: 500, color: D.color.ink, letterSpacing: '-0.015em', lineHeight: 1.04 }}>Add a spot</div>
        <div style={{ fontSize: 13.5, color: D.color.inkSoft, marginTop: 8, lineHeight: 1.45, marginBottom: 22 }}>Share a gem you found. A curator reviews every submission before it goes live.</div>

        <Field label="Where is it?">
          <div style={{ height: 84, borderRadius: D.radius.card, overflow: 'hidden', position: 'relative', border: `1px solid ${D.color.line}` }}>
            <TallinnMap theme={D.map} showLabels={false} />
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-100%)' }}><GemMarker cat="scenic" color={D.color.accent} variant={D.marker} size={26} /></div>
            <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 11.5, fontWeight: 700, color: D.color.ink, background: 'rgba(255,255,255,0.92)', padding: '4px 9px', borderRadius: 100 }}>Toompea · drag to adjust</div>
          </div>
        </Field>
        <Field label="Category">
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {GEM_CATEGORIES.slice(0, 5).map((c, i) => (
              <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: D.radius.chip,
                border: `1px solid ${i === 3 ? gemCatColor(D, c.id) : D.color.line}`, background: i === 3 ? gemCatColor(D, c.id) : D.color.surface, color: i === 3 ? '#fff' : D.color.inkSoft, fontSize: 12, fontWeight: 600 }}>
                <GemGlyph cat={c.id} size={13} color={i === 3 ? '#fff' : gemCatColor(D, c.id)} />{c.short}
              </span>
            ))}
          </div>
        </Field>
        <Field label="Name">
          <div style={{ borderBottom: `1.5px solid ${D.color.ink}`, paddingBottom: 8, fontFamily: D.font.head, fontSize: 18, color: D.color.ink, fontWeight: 500 }}>Tennis at Kadriorg</div>
        </Field>
        <Field label="Your note">
          <div style={{ fontSize: 14, color: D.color.inkFaint, lineHeight: 1.5, fontFamily: D.font.body }}>Six clay courts by the park edge…</div>
        </Field>
      </div>
      <div style={{ flex: '0 0 auto', borderTop: `1px solid ${D.color.line}`, padding: '12px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: D.color.inkFaint, fontWeight: 600 }}>3 of 6 added</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: D.color.accent, color: '#fff', padding: '11px 20px', borderRadius: D.radius.btn, fontWeight: 700, fontSize: 13.5 }}>Submit for review</div>
      </div>
      <HomeIndicator dark />
    </PhoneScreen>
  );
}

// C — modal sheet over the map
function AddModal({ D }) {
  return (
    <PhoneScreen bg={D.color.bg}>
      <MapStage D={D} showMe={false} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,20,28,0.28)', zIndex: 1 }} />
      {/* center drop pin */}
      <div style={{ position: 'absolute', left: '50%', top: '38%', transform: 'translate(-50%,-100%)', zIndex: 2 }}>
        <GemMarker cat="padel" color={D.color.accent} variant={D.marker} size={40} state="selected" label="Drag map to position" />
      </div>
      <div style={{ position: 'relative', zIndex: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <StatusBar dark />
        <div style={{ flex: 1 }} />
        <Sheet D={D} pad={16}>
          <div style={{ padding: '2px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: D.font.head, fontSize: 18, fontWeight: 700, color: D.color.ink, letterSpacing: '-0.01em' }}>Add a spot</div>
            <span style={{ fontSize: 12, fontWeight: 700, color: D.color.inkFaint }}>2 / 4</span>
          </div>
          <div style={{ padding: '12px 18px 0' }}><StepDots D={D} total={4} current={1} /></div>
          <div style={{ padding: '18px 18px 0', fontFamily: D.font.head, fontSize: 16, fontWeight: 700, color: D.color.ink }}>Choose a category</div>
          <div style={{ display: 'flex', gap: 9, overflowX: 'auto', padding: '12px 18px 4px' }}>
            {GEM_CATEGORIES.map((c, i) => {
              const on = i === 4; const col = gemCatColor(D, c.id);
              return (
                <div key={c.id} style={{ flex: '0 0 auto', width: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '12px 4px', borderRadius: D.radius.card,
                  background: on ? col : D.color.surface, border: `1.5px solid ${on ? col : D.color.line}`, boxShadow: on ? `0 5px 14px ${col}44` : 'none' }}>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', background: on ? 'rgba(255,255,255,0.25)' : col, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GemGlyph cat={c.id} size={18} color="#fff" />
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: on ? '#fff' : D.color.inkSoft, textAlign: 'center' }}>{c.short}</span>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '16px 18px 0', display: 'flex', gap: 10 }}>
            <ActBtn D={D} label="Back" />
            <ActBtn D={D} label="Next" kind="filled" flex icon="chevron" />
          </div>
        </Sheet>
        <HomeIndicator dark />
      </div>
    </PhoneScreen>
  );
}

// ── 6. Saved spots ──────────────────────────────────────────────────────────
function ScreenSaved({ D }) {
  const saved = [GEM_SPOTS[5], GEM_SPOTS[2], GEM_SPOTS[8], GEM_SPOTS[1]];
  const editorial = D.cardStyle === 'editorial';
  return (
    <PhoneScreen bg={D.color.bg}>
      <StatusBar dark />
      <div style={{ padding: '10px 18px 4px' }}>
        <div style={{ fontFamily: D.font.head, fontSize: 27, fontWeight: editorial ? 500 : 700, color: D.color.ink, letterSpacing: '-0.015em' }}>Saved spots</div>
        <div style={{ fontSize: 13, color: D.color.inkSoft, marginTop: 3, fontWeight: 500 }}>{saved.length} gems · 1 collection</div>
      </div>
      {/* segmented */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 18px 6px' }}>
        {['All saved', 'Collections', 'Nearby'].map((t, i) => (
          <span key={t} style={{ padding: '7px 13px', borderRadius: D.radius.chip, fontSize: 12.5, fontWeight: 700, fontFamily: D.font.body,
            background: i === 0 ? D.color.ink : D.color.surface, color: i === 0 ? D.color.bg : D.color.inkSoft, border: i === 0 ? 'none' : `1px solid ${D.color.line}` }}>{t}</span>
        ))}
      </div>
      <div style={{ flex: 1, padding: '8px 18px 0', overflow: 'hidden' }}>
        {/* collection banner */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, borderRadius: D.radius.card, background: D.color.surface, border: `1px solid ${D.color.line}`, marginBottom: 14, boxShadow: '0 2px 8px rgba(20,26,40,0.05)' }}>
          <div style={{ display: 'flex', flex: '0 0 auto' }}>
            {['#cdd6c8', '#cdd6df', '#d8cdd6'].map((c, i) => <div key={i} style={{ width: 38, height: 46, borderRadius: 7, background: c, marginLeft: i ? -14 : 0, border: '2px solid #fff' }} />)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: D.font.head, fontSize: 15, fontWeight: 700, color: D.color.ink, letterSpacing: '-0.01em' }}>Sunset walk · Toompea</div>
            <div style={{ fontSize: 11.5, color: D.color.inkFaint, fontWeight: 600, marginTop: 2 }}>6 spots · shared collection</div>
          </div>
          <UIcon name="chevron" size={18} stroke={D.color.inkFaint} />
        </div>
        {saved.slice(0, editorial ? 3 : 4).map((sp) => (
          editorial ? <SavedEditorialRow key={sp.id} D={D} sp={sp} /> : <ResultRow key={sp.id} D={D} sp={sp} />
        ))}
      </div>
      <BottomNav D={D} active="saved" />
    </PhoneScreen>
  );
}

function SavedEditorialRow({ D, sp }) {
  return (
    <div style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: `1px solid ${D.color.line}`, alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 9.5, fontWeight: 700, color: gemCatColor(D, sp.cat), marginBottom: 5 }}>{GEM_CAT[sp.cat].label}</div>
        <div style={{ fontFamily: D.font.head, fontSize: 19, fontWeight: 500, color: D.color.ink, letterSpacing: '-0.01em', lineHeight: 1.1 }}>{sp.name}</div>
        <div style={{ fontSize: 12, color: D.color.inkSoft, marginTop: 5, fontWeight: 500 }}>{sp.hood} · {sp.rating} ★</div>
      </div>
      <PhotoSlot label="" w={72} h={72} tint="#d3d6cf" radius={D.radius.card} style={{ flex: '0 0 auto' }} />
    </div>
  );
}

Object.assign(window, { ScreenDetail, ScreenAdd, AddStepper, AddPage, AddModal, ScreenSaved, SavedEditorialRow });
