/* GemSpot — Direction C MVP screens, part 1: Explore, Filter, Preview, Detail.
   Built on the shared MapFrame/Sheet primitives; uses the refined C parts. */

// ── 1. Explore ──────────────────────────────────────────────────────────────
// Fixes: single filter system (chips + "All", no separate sliders button),
// distance on cards, one save metaphor.
function CExplore({ D }) {
  const featured = [GEM_SPOTS[5], GEM_SPOTS[2], GEM_SPOTS[7]];
  const savedSet = ['s6'];
  return (
    <MapFrame D={D}
      header={
        <div style={{ padding: '6px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SearchPill D={D} />
          <CChips D={D} active={null} />
        </div>
      }
      controls={<><MapBtn D={D} icon="layers" /><MapBtn D={D} icon="location" active /></>}
      sheet={
        <Sheet D={D} pad={10}>
          <div style={{ padding: '2px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: D.font.head, fontSize: 16, fontWeight: 700, color: D.color.ink, letterSpacing: '-0.01em' }}>32 spots nearby</div>
              <div style={{ fontSize: 11.5, color: D.color.inkFaint, fontWeight: 600, marginTop: 1 }}>Spotted by locals · sorted by distance</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: D.color.accent }}>
              List <UIcon name="chevronUp" size={15} stroke={D.color.accent} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 2px' }}>
            {featured.map((sp) => <CMiniCard key={sp.id} D={D} sp={sp} saved={savedSet.includes(sp.id)} />)}
          </div>
        </Sheet>
      }
      nav="explore"
      navBar={<CBottomNav D={D} active="explore" />}
    />
  );
}

// ── 2. Category filter ──────────────────────────────────────────────────────
// Fixes: clear-filter affordance (× on the active chip header), distance sort,
// consistent label, empty-state handled separately (CEmptyFilter).
function CFilter({ D }) {
  const cat = 'scenic';
  const results = GEM_SPOTS.filter((s) => s.cat === cat);
  const savedSet = ['s6'];
  return (
    <MapFrame D={D} mapProps={{ filter: cat, selectedId: 's6' }}
      header={
        <div style={{ padding: '6px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 46, height: 46, borderRadius: D.radius.btn, background: D.color.surface, border: `1px solid ${D.color.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(20,26,40,0.12)', flex: '0 0 auto' }}>
              <UIcon name="back" size={20} stroke={D.color.ink} />
            </div>
            <div style={{ flex: 1 }}><SearchPill D={D} placeholder="Search scenic spots" leading="search" /></div>
          </div>
          <CChips D={D} active={cat} />
        </div>
      }
      sheet={
        <Sheet D={D}>
          <div style={{ padding: '2px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CatBadge D={D} cat={cat} size="lg" />
              {/* clear-filter chip */}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: D.color.inkSoft,
                background: D.color.surface2, padding: '4px 9px 4px 10px', borderRadius: 100 }}>
                Clear <UIcon name="close" size={12} stroke={D.color.inkSoft} strokeWidth={2} />
              </span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: D.color.inkFaint }}>{results.length} spots · nearest</span>
          </div>
          <div style={{ padding: '4px 16px 0' }}>
            {results.slice(0, 2).map((sp) => <CResultRow key={sp.id} D={D} sp={sp} saved={savedSet.includes(sp.id)} />)}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: D.color.accent }}>Show all {results.length} scenic spots</span>
            </div>
          </div>
        </Sheet>
      }
      nav="explore"
      navBar={<CBottomNav D={D} active="explore" />}
    />
  );
}

// ── 3. Place preview ─────────────────────────────────────────────────────────
function CPreview({ D }) {
  const sp = GEM_SPOTS[5];
  return (
    <MapFrame D={D} mapProps={{ selectedId: sp.id }}
      header={
        <div style={{ padding: '6px 14px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: D.radius.btn, background: D.color.surface, border: `1px solid ${D.color.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(20,26,40,0.12)' }}>
            <UIcon name="back" size={20} stroke={D.color.ink} />
          </div>
        </div>
      }
      sheet={<Sheet D={D} pad={16}><CPreviewCard D={D} sp={sp} saved={true} /></Sheet>}
      nav="explore"
      navBar={<CBottomNav D={D} active="explore" />}
    />
  );
}

// ── 4. Place detail ───────────────────────────────────────────────────────────
// Fixes: ONE save control (bookmark, shown saved); no stars; "Directions" hands
// off to Apple/Google Maps (chooser hint); report/flag entry for moderation;
// quick facts trimmed to what MVP actually has.
function CDetail({ D }) {
  const sp = GEM_SPOTS[5];
  const heroH = 218;
  const facts = [
    { icon: 'pin', label: sp.hood },
    { icon: 'bookmark', label: `${sp.saves} saved` },
    { icon: 'clock', label: 'Open access' },
  ];
  return (
    <PhoneScreen bg={D.color.surface}>
      {/* hero */}
      <div style={{ position: 'relative', height: heroH, flex: '0 0 auto' }}>
        <PhotoSlot label={`${sp.cat} · ${sp.photos} photos`} h={heroH} tint="#b9c2b4" dark />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,14,20,0.45) 0%, rgba(10,14,20,0) 32%, rgba(10,14,20,0) 60%, rgba(10,14,20,0.35) 100%)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}><StatusBar dark={false} /></div>
        <div style={{ position: 'absolute', top: 34, left: 14, right: 14, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ width: 40, height: 40, borderRadius: D.radius.btn, background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UIcon name="back" size={20} stroke={D.color.ink} />
          </div>
          <div style={{ width: 40, height: 40, borderRadius: D.radius.btn, background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UIcon name="share" size={19} stroke={D.color.ink} />
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 12, left: 14, display: 'flex', gap: 6 }}>
          {[0, 1, 2].map((i) => <div key={i} style={{ width: i === 0 ? 18 : 6, height: 6, borderRadius: 3, background: i === 0 ? '#fff' : 'rgba(255,255,255,0.55)' }} />)}
        </div>
      </div>

      {/* content */}
      <div style={{ flex: 1, background: D.color.surface, padding: '18px 18px 0', marginTop: -22,
        borderTopLeftRadius: D.radius.sheet, borderTopRightRadius: D.radius.sheet, position: 'relative', zIndex: 2, overflow: 'hidden' }}>
        <div style={{ marginBottom: 9 }}><CatBadge D={D} cat={sp.cat} size="lg" /></div>
        <div style={{ fontFamily: D.font.head, fontSize: 24, fontWeight: 700, color: D.color.ink, lineHeight: 1.05, letterSpacing: '-0.015em' }}>{sp.name}</div>

        {/* attribution + report */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0' }}>
          <Avatar size={26} label="M" bg={D.color.accent} />
          <span style={{ fontSize: 12.5, color: D.color.inkSoft, fontWeight: 600 }}>Spotted by <b style={{ color: D.color.ink }}>Marta</b></span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#2f9e5b', background: D.color.surface2, padding: '3px 8px', borderRadius: 100 }}>
            <UIcon name="check" size={12} stroke="#2f9e5b" strokeWidth={2.2} /> Approved
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: D.color.inkFaint }}>Report</span>
        </div>

        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: D.color.inkSoft, fontFamily: D.font.body, marginBottom: 14 }}>{sp.note}</div>

        {/* quick facts (no rating) */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {facts.map((f) => (
            <div key={f.label} style={{ flex: 1, background: D.color.surface2, borderRadius: D.radius.card * 0.7, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
              <UIcon name={f.icon} size={17} stroke={D.color.accent} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: D.color.ink, textAlign: 'center' }}>{f.label}</span>
            </div>
          ))}
        </div>

        {/* photo strip */}
        <div style={{ display: 'flex', gap: 8 }}>
          {['locals', 'sunset', 'winter'].map((l) => <PhotoSlot key={l} label={l} w={88} h={62} tint="#cdd6c8" radius={D.radius.card * 0.6} style={{ flex: '0 0 auto' }} />)}
        </div>
      </div>

      {/* action bar — single save (bookmark, saved) + Directions handoff */}
      <div style={{ flex: '0 0 auto', background: D.color.surface, borderTop: `1px solid ${D.color.line}`, padding: '10px 16px', display: 'flex', gap: 10, zIndex: 5, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, height: 44, width: 56, borderRadius: D.radius.btn, background: D.color.accent, flex: '0 0 auto' }}>
          <UIcon name="bookmark" size={18} stroke="#fff" fill="#fff" />
          <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff' }}>Saved</span>
        </div>
        <div style={{ flex: 1, height: 44, borderRadius: D.radius.btn, background: D.color.surface, border: `1.5px solid ${D.color.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <UIcon name="route" size={18} stroke={D.color.ink} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: D.color.ink }}>Directions</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: D.color.inkFaint }}>· Apple / Google Maps</span>
        </div>
      </div>
      <HomeIndicator dark />
    </PhoneScreen>
  );
}

Object.assign(window, { CExplore, CFilter, CPreview, CDetail });
