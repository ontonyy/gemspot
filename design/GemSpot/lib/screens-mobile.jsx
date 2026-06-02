/* GemSpot — mobile screens (part 1): Explore, Category filter, Place preview.
   Each is a component taking the direction config D. */

// Small horizontal card for the collapsed explore sheet.
function MiniCard({ D, sp }) {
  return (
    <div style={{ width: 172, flex: '0 0 auto', borderRadius: D.radius.card, background: D.color.surface,
      border: `1px solid ${D.color.line}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(20,26,40,0.06)' }}>
      <div style={{ position: 'relative' }}>
        <PhotoSlot label="photo" h={86} tint="#cdd6c8" />
        <div style={{ position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderRadius: '50%', background: gemCatColor(D, sp.cat),
          display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
          <GemGlyph cat={sp.cat} size={13} color="#fff" />
        </div>
      </div>
      <div style={{ padding: '8px 10px 10px' }}>
        <div style={{ fontFamily: D.font.head, fontSize: 13.5, fontWeight: 700, color: D.color.ink, lineHeight: 1.12, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sp.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
          <span style={{ fontSize: 10.5, color: D.color.inkSoft, fontWeight: 600 }}>{sp.hood}</span>
          <span style={{ width: 2.5, height: 2.5, borderRadius: 2, background: D.color.inkFaint }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2.5, fontSize: 10.5, color: D.color.inkSoft, fontWeight: 700 }}>
            <UIcon name="star" size={11} stroke="none" fill={D.color.star || '#f2a33c'} />{sp.rating}
          </span>
        </div>
      </div>
    </div>
  );
}

// Compact list row (filter results).
function ResultRow({ D, sp }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '11px 0', borderBottom: `1px solid ${D.color.line}`, alignItems: 'center' }}>
      <PhotoSlot label="" w={56} h={56} tint="#cdd6df" radius={D.radius.card * 0.6} style={{ flex: '0 0 auto' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: D.font.head, fontSize: 15, fontWeight: 700, color: D.color.ink, lineHeight: 1.1, letterSpacing: '-0.01em' }}>{sp.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '4px 0 6px' }}>
          <span style={{ fontSize: 11.5, color: D.color.inkSoft, fontWeight: 600 }}>{sp.hood}</span>
          <span style={{ width: 2.5, height: 2.5, borderRadius: 2, background: D.color.inkFaint }} />
          <SpotMeta D={D} sp={sp} size={11} />
        </div>
        <TagRow D={D} tags={sp.tags} max={2} />
      </div>
      <UIcon name="chevron" size={18} stroke={D.color.inkFaint} />
    </div>
  );
}

// Shared screen frame: map behind, overlay column on top.
function MapFrame({ D, mapProps = {}, header, controls, sheet, nav = 'explore', dim = false, navBar = null }) {
  return (
    <PhoneScreen bg={D.color.bg}>
      <MapStage D={D} {...mapProps} />
      {dim && <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,20,28,0.18)', zIndex: 1 }} />}
      <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <StatusBar dark />
        {header}
        <div style={{ flex: 1 }} />
        {controls && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 14px 12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>{controls}</div>
          </div>
        )}
        {sheet}
        {navBar || <BottomNav D={D} active={nav} />}
      </div>
    </PhoneScreen>
  );
}

// ── 1. Explore (default) ────────────────────────────────────────────────────
function ScreenExplore({ D }) {
  const featured = [GEM_SPOTS[5], GEM_SPOTS[2], GEM_SPOTS[7]];
  return (
    <MapFrame D={D}
      header={
        <div style={{ padding: '6px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SearchPill D={D} trailing={
            <div style={{ width: 30, height: 30, borderRadius: D.radius.btn, background: D.color.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UIcon name="sliders" size={17} stroke="#fff" />
            </div>
          } />
          <CategoryChips D={D} active={null} />
        </div>
      }
      controls={<><MapBtn D={D} icon="layers" /><MapBtn D={D} icon="location" active /></>}
      sheet={
        <Sheet D={D} pad={10}>
          <div style={{ padding: '2px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: D.font.head, fontSize: 16, fontWeight: 700, color: D.color.ink, letterSpacing: '-0.01em' }}>32 spots nearby</div>
              <div style={{ fontSize: 11.5, color: D.color.inkFaint, fontWeight: 600, marginTop: 1 }}>Spotted by locals · within 2 km</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: D.color.accent }}>
              List <UIcon name="chevronUp" size={15} stroke={D.color.accent} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 2px' }}>
            {featured.map((sp) => <MiniCard key={sp.id} D={D} sp={sp} />)}
          </div>
        </Sheet>
      }
    />
  );
}

// ── 2. Category filter ──────────────────────────────────────────────────────
function ScreenFilter({ D }) {
  const cat = 'scenic';
  const results = GEM_SPOTS.filter((s) => s.cat === cat);
  return (
    <MapFrame D={D} mapProps={{ filter: cat, selectedId: 's6' }}
      header={
        <div style={{ padding: '6px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 46, height: 46, borderRadius: D.radius.btn, background: D.color.surface, border: `1px solid ${D.color.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(20,26,40,0.12)', flex: '0 0 auto' }}>
              <UIcon name="back" size={20} stroke={D.color.ink} />
            </div>
            <div style={{ flex: 1 }}><SearchPill D={D} placeholder="Scenic spots" leading="search" /></div>
          </div>
          <CategoryChips D={D} active={cat} />
        </div>
      }
      sheet={
        <Sheet D={D}>
          <div style={{ padding: '2px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: D.font.head, fontSize: 16, fontWeight: 700, color: D.color.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CatBadge D={D} cat={cat} size="lg" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: D.color.inkFaint }}>{results.length} spots · top rated</span>
          </div>
          <div style={{ padding: '4px 16px 0' }}>
            {results.slice(0, 2).map((sp) => <ResultRow key={sp.id} D={D} sp={sp} />)}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: D.color.accent }}>Show all {results.length} scenic spots</span>
            </div>
          </div>
        </Sheet>
      }
    />
  );
}

// ── 3. Place preview (selected marker → sheet) ──────────────────────────────
function ScreenPreview({ D }) {
  const sp = GEM_SPOTS[5]; // Patkuli viewpoint
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
      sheet={
        <Sheet D={D} pad={16}>
          <PreviewCard D={D} sp={sp} />
        </Sheet>
      }
    />
  );
}

Object.assign(window, { MiniCard, ResultRow, MapFrame, ScreenExplore, ScreenFilter, ScreenPreview });
