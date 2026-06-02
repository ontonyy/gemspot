/* GemSpot — shared compositional pieces (map stage with live markers,
   category chips, search, bottom nav). Each direction styles via its config D. */

function gemCatColor(D, cat) { return (D.cat && D.cat[cat]) || D.color.accent; }

// MapStage — the live map with category markers laid over it.
function MapStage({ D, selectedId = null, savedIds = [], filter = null, showMe = true, children, style = {} }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style }}>
      <TallinnMap theme={D.map} showLabels={D.map.showLabels !== false} />

      {/* my location */}
      {showMe && (
        <div style={{ position: 'absolute', left: '63%', top: '47%', transform: 'translate(-50%,-50%)' }}>
          <div style={{ position: 'absolute', width: 40, height: 40, borderRadius: '50%', background: D.color.accent, opacity: 0.16, left: -20, top: -20 }} />
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: D.color.accent, border: '3px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />
        </div>
      )}

      {/* markers */}
      {GEM_SPOTS.map((sp) => {
        const dimmed = filter && sp.cat !== filter;
        const selected = sp.id === selectedId;
        return (
          <div key={sp.id} style={{
            position: 'absolute', left: `${sp.x}%`, top: `${sp.y}%`,
            transform: 'translate(-50%,-100%)', zIndex: selected ? 20 : dimmed ? 1 : 5,
            opacity: dimmed ? 0.32 : 1, filter: dimmed ? 'saturate(0.5)' : 'none',
            transition: 'opacity .2s',
          }}>
            <GemMarker cat={sp.cat} color={gemCatColor(D, sp.cat)} variant={D.marker}
              size={selected ? 32 : dimmed ? 24 : 30}
              state={selected ? 'selected' : 'default'}
              saved={savedIds.includes(sp.id)}
              label={selected ? sp.name : null} />
          </div>
        );
      })}
      {children}
    </div>
  );
}

// Category chips row.
function CategoryChips({ D, active = null, onlyIcons = false, style = {} }) {
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 14px 4px', ...style }}>
      {GEM_CATEGORIES.map((c) => {
        const on = active === c.id;
        const col = gemCatColor(D, c.id);
        return (
          <div key={c.id} style={{
            flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6,
            height: 34, padding: onlyIcons ? '0 9px' : '0 12px 0 9px', borderRadius: D.radius.chip,
            background: on ? col : D.color.chipBg,
            color: on ? '#fff' : D.color.chipInk,
            border: on ? `1.5px solid ${col}` : `1.5px solid ${D.color.line}`,
            fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap', fontFamily: D.font.body,
            boxShadow: on ? `0 2px 8px ${col}55` : 'none',
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%', background: on ? 'rgba(255,255,255,0.22)' : col,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
            }}>
              <GemGlyph cat={c.id} size={14} color="#fff" />
            </span>
            {!onlyIcons && (on ? c.label : c.short)}
          </div>
        );
      })}
    </div>
  );
}

// Floating search pill.
function SearchPill({ D, placeholder = 'Search spots in Tallinn', leading = 'search', trailing, onLight = true }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, height: 46, padding: '0 14px',
      borderRadius: D.radius.btn, background: D.color.surface,
      boxShadow: '0 4px 16px rgba(20,26,40,0.12), 0 1px 3px rgba(20,26,40,0.08)',
      border: `1px solid ${D.color.line}`, fontFamily: D.font.body,
    }}>
      <UIcon name={leading} size={18} stroke={D.color.inkFaint} />
      <span style={{ flex: 1, color: D.color.inkFaint, fontSize: 14, fontWeight: 500 }}>{placeholder}</span>
      {trailing}
    </div>
  );
}

// Round map control button.
function MapBtn({ D, icon, active = false, style = {} }) {
  return (
    <div style={{
      width: 44, height: 44, borderRadius: D.radius.btn, background: active ? D.color.accent : D.color.surface,
      boxShadow: '0 3px 10px rgba(20,26,40,0.16)', border: `1px solid ${D.color.line}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', ...style,
    }}>
      <UIcon name={icon} size={20} stroke={active ? '#fff' : D.color.ink} />
    </div>
  );
}

// Bottom navigation bar.
const GEM_NAV = [
  { id: 'explore', label: 'Explore', icon: 'compass' },
  { id: 'saved', label: 'Saved', icon: 'bookmark' },
  { id: 'add', label: 'Add', icon: 'plus' },
  { id: 'guides', label: 'Guides', icon: 'layers' },
  { id: 'profile', label: 'You', icon: null },
];
function BottomNav({ D, active = 'explore' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '8px 6px 4px', background: D.color.navBg, borderTop: `1px solid ${D.color.line}`,
      flex: '0 0 auto', position: 'relative', zIndex: 30, fontFamily: D.font.body,
    }}>
      {GEM_NAV.map((n) => {
        const on = active === n.id;
        if (n.id === 'add') {
          return (
            <div key={n.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 44, height: 44, borderRadius: D.marker === 'playful' ? 16 : D.radius.btn, background: D.color.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${D.color.accent}66`, marginTop: -6 }}>
                <UIcon name="plus" size={22} stroke={D.color.accentInk || '#fff'} strokeWidth={2} />
              </div>
            </div>
          );
        }
        return (
          <div key={n.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: on ? D.color.accent : D.color.inkFaint, minWidth: 48 }}>
            {n.icon
              ? <UIcon name={n.icon} size={21} stroke={on ? D.color.accent : D.color.inkFaint} fill={on && n.id === 'saved' ? D.color.accent : 'none'} />
              : <Avatar size={21} label="M" bg={on ? D.color.accent : D.color.inkFaint} />}
            <span style={{ fontSize: 10, fontWeight: on ? 700 : 600 }}>{n.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Rating + saves inline meta.
function SpotMeta({ D, sp, size = 12 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: size, color: D.color.inkSoft, fontWeight: 600, fontFamily: D.font.body }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        <UIcon name="star" size={size + 2} stroke="none" fill={D.color.star || '#f2a33c'} />
        {sp.rating}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: D.color.inkFaint }}>
        <UIcon name="heart" size={size + 1} stroke={D.color.inkFaint} />
        {sp.saves}
      </span>
    </div>
  );
}

Object.assign(window, { gemCatColor, MapStage, CategoryChips, SearchPill, MapBtn, BottomNav, GEM_NAV, SpotMeta });
