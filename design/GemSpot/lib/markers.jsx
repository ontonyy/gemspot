/* GemSpot — category data + themeable marker family.
   Categories are recognizable by BOTH color and glyph shape.
   Marker supports states: default · selected · saved.
   variant: 'playful' | 'editorial' | 'clean' tunes the visual language. */

// ── Category glyphs (simple geometric icons, white-on-color) ──────────────
// Each returns SVG children drawn in a 24×24 box; stroke/fill use currentColor.
const GEM_GLYPHS = {
  tabletennis: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="9" r="5.4" fill="currentColor" stroke="none" />
      <path d="M13.4 12.6l4 4.2" />
      <circle cx="17.6" cy="17" r="1.5" fill="currentColor" stroke="none" />
    </g>
  ),
  basketball: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <circle cx="12" cy="12" r="7.4" />
      <path d="M12 4.6v14.8M4.6 12h14.8" />
      <path d="M6.7 6.7C9 9 9 15 6.7 17.3M17.3 6.7C15 9 15 15 17.3 17.3" />
    </g>
  ),
  football: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="7.4" />
      <path d="M12 8.2l3.3 2.4-1.3 3.9h-4l-1.3-3.9z" fill="currentColor" stroke="none" />
      <path d="M12 4.6v3.6M15.3 10.6l3.1-1M13.7 14.5l2 3M10.3 14.5l-2 3M8.7 10.6l-3.1-1" />
    </g>
  ),
  tennis: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <circle cx="12" cy="12" r="7.4" />
      <path d="M6.3 7.2C9.5 9 9.5 15 6.3 16.8" />
      <path d="M17.7 7.2C14.5 9 14.5 15 17.7 16.8" />
    </g>
  ),
  padel: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.4c-3.7 0-6.4 2.7-6.4 6.1 0 3.2 2.5 5.6 6.4 5.6s6.4-2.4 6.4-5.6c0-3.4-2.7-6.1-6.4-6.1z" />
      <path d="M12 15.1v5.5" />
      <circle cx="9.6" cy="8.4" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="8.4" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="11.2" r="1" fill="currentColor" stroke="none" />
    </g>
  ),
  scenic: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16.5" cy="7.5" r="2.1" fill="currentColor" stroke="none" />
      <path d="M3.5 18.5l4.4-6 3 3.6 3-4.4 6.6 6.8z" fill="currentColor" stroke="none" />
    </g>
  ),
  sakura: (
    <g fill="currentColor" stroke="none">
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="12" cy="6.4" rx="2.5" ry="3.7"
          transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="1.9" fill="#fff" opacity="0.9" />
    </g>
  ),
};

// Canonical hue per category (each direction maps these into its palette).
const GEM_CATEGORIES = [
  { id: 'tabletennis', label: 'Table tennis', short: 'Ping pong', hue: 'amber' },
  { id: 'basketball', label: 'Basketball', short: 'Hoops', hue: 'orange' },
  { id: 'football', label: 'Football', short: 'Football', hue: 'green' },
  { id: 'tennis', label: 'Tennis', short: 'Tennis', hue: 'lime' },
  { id: 'padel', label: 'Padel', short: 'Padel', hue: 'teal' },
  { id: 'scenic', label: 'Scenic spot', short: 'Views', hue: 'blue' },
  { id: 'sakura', label: 'Sakura spot', short: 'Sakura', hue: 'pink' },
];

const GEM_CAT = Object.fromEntries(GEM_CATEGORIES.map((c) => [c.id, c]));

// Glyph-only renderer (for chips, legends).
function GemGlyph({ cat, size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color, display: 'block' }}>
      {GEM_GLYPHS[cat]}
    </svg>
  );
}

// ── Marker ────────────────────────────────────────────────────────────────
// props: cat, color, size, state ('default'|'selected'), saved, label, variant
function GemMarker({
  cat, color, size = 34, state = 'default', saved = false, label, count,
  variant = 'clean', style = {},
}) {
  const selected = state === 'selected';
  const s = selected ? Math.round(size * 1.32) : size;

  // Variant-specific chrome
  const ring = variant === 'editorial' ? 2 : variant === 'playful' ? 3 : 2.5;
  const shadow = selected
    ? '0 8px 22px rgba(20,26,40,0.34), 0 2px 6px rgba(20,26,40,0.22)'
    : variant === 'editorial'
      ? '0 1px 4px rgba(20,26,40,0.22)'
      : '0 3px 9px rgba(20,26,40,0.26)';
  const radius = variant === 'playful' ? '50% 50% 50% 12%' : '50%';
  const glyphSize = Math.round(s * 0.62);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', ...style }}>
      {/* selection halo */}
      {selected && (
        <div style={{
          position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)',
          width: s + 14, height: s + 14, borderRadius: '50%',
          background: color, opacity: 0.16, zIndex: 0,
        }} />
      )}
      <div style={{
        position: 'relative', zIndex: 1,
        width: s, height: s, borderRadius: radius,
        transform: variant === 'playful' ? 'rotate(-45deg)' : 'none',
        background: color, boxShadow: shadow,
        border: `${ring}px solid #fff`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .18s cubic-bezier(.2,.7,.3,1)',
      }}>
        <div style={{ transform: variant === 'playful' ? 'rotate(45deg)' : 'none', display: 'flex' }}>
          <GemGlyph cat={cat} size={glyphSize} color="#fff" />
        </div>
        {saved && (
          <div style={{
            position: 'absolute', top: -4, right: -5, width: 15, height: 15, borderRadius: '50%',
            background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,.25)', transform: variant === 'playful' ? 'rotate(45deg)' : 'none',
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="#e0567a"><path d="M12 21s-7.5-4.9-10-9.5C.3 8 2 4.5 5.4 4.5c2 0 3.5 1.2 4.6 2.8 1.1-1.6 2.6-2.8 4.6-2.8C18 4.5 19.7 8 18 11.5 15.5 16.1 12 21 12 21z"/></svg>
          </div>
        )}
        {count != null && (
          <div style={{
            position: 'absolute', top: -6, right: -6, minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 8, background: '#1b2336', color: '#fff', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff',
            transform: variant === 'playful' ? 'rotate(45deg)' : 'none',
          }}>{count}</div>
        )}
      </div>
      {selected && label && (
        <div style={{
          marginTop: 6, padding: '3px 9px', borderRadius: 100, background: '#fff',
          fontSize: 11.5, fontWeight: 650, color: '#1b2336', whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(20,26,40,0.2)', letterSpacing: '-0.01em',
        }}>{label}</div>
      )}
    </div>
  );
}

Object.assign(window, { GEM_GLYPHS, GEM_CATEGORIES, GEM_CAT, GemGlyph, GemMarker });
