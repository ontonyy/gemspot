/* GemSpot — Direction C, MVP-refined primitives.
   Decisions applied:
   · Ratings/reviews are POST-MVP → no stars anywhere. Social proof = saves + distance.
   · ONE save metaphor everywhere → bookmark (pairs with the "Saved" nav tab).
   · MVP bottom nav = Explore · Saved · Add · You  (Guides deferred to v2).
   These reuse the shared primitives (Sheet, ActBtn, CatBadge, MapStage…) and
   only override the pieces that change for the MVP. */

// Faux straight-line distances from "my location" (deterministic, demo only).
const C_DIST = { s1: 0.4, s2: 1.8, s3: 1.1, s4: 2.6, s5: 3.1, s6: 0.7, s7: 0.9, s8: 0.5, s9: 2.9, s10: 0.8 };
function cDist(id) { return C_DIST[id] != null ? `${C_DIST[id].toFixed(1)} km` : null; }

// Meta line: distance + saves (NO rating). size scales the type.
function CMeta({ D, sp, size = 12, showDist = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: size, color: D.color.inkSoft, fontWeight: 600, fontFamily: D.font.body }}>
      {showDist && cDist(sp.id) && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <UIcon name="pin" size={size + 2} stroke={D.color.inkFaint} strokeWidth={1.8} />
          {cDist(sp.id)}
        </span>
      )}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: D.color.inkFaint }}>
        <UIcon name="bookmark" size={size + 1} stroke={D.color.inkFaint} />
        {sp.saves}
      </span>
    </div>
  );
}

// Bookmark toggle button — the single, consistent save control.
function CSaveBtn({ D, saved = false, size = 36, onLight = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flex: '0 0 auto',
      background: onLight ? 'rgba(255,255,255,0.94)' : (saved ? D.color.accent : D.color.surface),
      border: saved && !onLight ? 'none' : `1px solid ${D.color.line}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: onLight ? '0 2px 8px rgba(20,26,40,0.18)' : 'none',
    }}>
      <UIcon name="bookmark" size={size * 0.5} stroke={saved && !onLight ? '#fff' : D.color.ink}
        fill={saved ? (onLight ? D.color.accent : '#fff') : 'none'} />
    </div>
  );
}

// Explore carousel card — name, hood, distance, saves (no star).
function CMiniCard({ D, sp, saved = false }) {
  return (
    <div style={{ width: 178, flex: '0 0 auto', borderRadius: D.radius.card, background: D.color.surface,
      border: `1px solid ${D.color.line}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(20,26,40,0.06)' }}>
      <div style={{ position: 'relative' }}>
        <PhotoSlot label="photo" h={86} tint="#cdd6c8" />
        <div style={{ position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderRadius: '50%', background: gemCatColor(D, sp.cat),
          display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
          <GemGlyph cat={sp.cat} size={13} color="#fff" />
        </div>
        <div style={{ position: 'absolute', top: 6, right: 6 }}><CSaveBtn D={D} saved={saved} size={28} onLight /></div>
      </div>
      <div style={{ padding: '8px 10px 10px' }}>
        <div style={{ fontFamily: D.font.head, fontSize: 13.5, fontWeight: 700, color: D.color.ink, lineHeight: 1.12, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sp.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
          <span style={{ fontSize: 10.5, color: D.color.inkSoft, fontWeight: 600 }}>{sp.hood}</span>
          <span style={{ width: 2.5, height: 2.5, borderRadius: 2, background: D.color.inkFaint }} />
          <span style={{ fontSize: 10.5, color: D.color.inkSoft, fontWeight: 700 }}>{cDist(sp.id)}</span>
        </div>
      </div>
    </div>
  );
}

// List row used by Filter + Saved. `onSaved`+`saved` show an inline bookmark toggle
// (lets users remove from Saved without opening the place).
function CResultRow({ D, sp, saved = false, showSave = false }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '11px 0', borderBottom: `1px solid ${D.color.line}`, alignItems: 'center' }}>
      <PhotoSlot label="" w={56} h={56} tint="#cdd6df" radius={D.radius.card * 0.6} style={{ flex: '0 0 auto' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: D.font.head, fontSize: 15, fontWeight: 700, color: D.color.ink, lineHeight: 1.1, letterSpacing: '-0.01em' }}>{sp.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '4px 0 6px' }}>
          <span style={{ fontSize: 11.5, color: D.color.inkSoft, fontWeight: 600 }}>{sp.hood}</span>
          <span style={{ width: 2.5, height: 2.5, borderRadius: 2, background: D.color.inkFaint }} />
          <CMeta D={D} sp={sp} size={11} />
        </div>
        <TagRow D={D} tags={sp.tags} max={2} />
      </div>
      {showSave
        ? <CSaveBtn D={D} saved={saved} size={34} />
        : <UIcon name="chevron" size={18} stroke={D.color.inkFaint} />}
    </div>
  );
}

// Preview sheet card — compact utility row, consistent action labels.
function CPreviewCard({ D, sp, saved = false }) {
  return (
    <div style={{ padding: '6px 16px 0' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <PhotoSlot label="photo" w={96} h={96} tint="#cfd6df" radius={D.radius.card} style={{ flex: '0 0 auto' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 5 }}><CatBadge D={D} cat={sp.cat} /></div>
          <div style={{ fontFamily: D.font.head, fontSize: 17, fontWeight: 700, color: D.color.ink, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{sp.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '4px 0 8px' }}>
            <span style={{ fontSize: 12, color: D.color.inkSoft, fontWeight: 600 }}>{sp.hood}</span>
            <span style={{ width: 3, height: 3, borderRadius: 2, background: D.color.inkFaint }} />
            <CMeta D={D} sp={sp} size={11.5} />
          </div>
          <TagRow D={D} tags={sp.tags} max={3} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <ActBtn D={D} label="Details" kind="filled" flex />
        <ActBtn D={D} label="Directions" icon="route" />
        <div style={{ width: 44, height: 44, borderRadius: D.radius.btn, background: saved ? D.color.accent : D.color.surface2,
          border: saved ? 'none' : `1px solid ${D.color.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
          <UIcon name="bookmark" size={19} stroke={saved ? '#fff' : D.color.ink} fill={saved ? '#fff' : 'none'} />
        </div>
      </div>
    </div>
  );
}

// MVP bottom nav — Explore · Saved · Add · You (Guides deferred to v2).
const C_NAV = [
  { id: 'explore', label: 'Explore', icon: 'compass' },
  { id: 'saved', label: 'Saved', icon: 'bookmark' },
  { id: 'add', label: 'Add', icon: 'plus' },
  { id: 'profile', label: 'You', icon: null },
];
function CBottomNav({ D, active = 'explore' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '8px 10px 4px', background: D.color.navBg, borderTop: `1px solid ${D.color.line}`,
      flex: '0 0 auto', position: 'relative', zIndex: 30, fontFamily: D.font.body,
    }}>
      {C_NAV.map((n) => {
        const on = active === n.id;
        if (n.id === 'add') {
          return (
            <div key={n.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 46, height: 46, borderRadius: D.radius.btn, background: D.color.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${D.color.accent}66`, marginTop: -6 }}>
                <UIcon name="plus" size={23} stroke="#fff" strokeWidth={2} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: D.color.inkFaint }}>Add</span>
            </div>
          );
        }
        return (
          <div key={n.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: on ? D.color.accent : D.color.inkFaint, minWidth: 54 }}>
            {n.icon
              ? <UIcon name={n.icon} size={22} stroke={on ? D.color.accent : D.color.inkFaint} fill={on && n.id === 'saved' ? D.color.accent : 'none'} />
              : <Avatar size={22} label="A" bg={on ? D.color.accent : D.color.inkFaint} />}
            <span style={{ fontSize: 10, fontWeight: on ? 700 : 600 }}>{n.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Category chips with a leading "All" reset chip (single filter system).
function CChips({ D, active = null }) {
  const items = [{ id: null, short: 'All' }, ...GEM_CATEGORIES];
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 14px 4px' }}>
      {items.map((c) => {
        const on = active === c.id;
        const isAll = c.id === null;
        const col = isAll ? D.color.ink : gemCatColor(D, c.id);
        return (
          <div key={c.id || 'all'} style={{
            flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6,
            height: 34, padding: isAll ? '0 14px' : '0 12px 0 9px', borderRadius: D.radius.chip,
            background: on ? col : D.color.chipBg,
            color: on ? '#fff' : D.color.chipInk,
            border: on ? `1.5px solid ${col}` : `1.5px solid ${D.color.line}`,
            fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap', fontFamily: D.font.body,
            boxShadow: on ? `0 2px 8px ${col}55` : 'none',
          }}>
            {!isAll && (
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: on ? 'rgba(255,255,255,0.22)' : col,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <GemGlyph cat={c.id} size={14} color="#fff" />
              </span>
            )}
            {isAll ? 'All' : (on ? c.label : c.short)}
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { C_DIST, cDist, CMeta, CSaveBtn, CMiniCard, CResultRow, CPreviewCard, C_NAV, CBottomNav, CChips });
