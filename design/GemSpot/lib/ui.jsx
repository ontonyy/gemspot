/* GemSpot — shared mobile UI primitives used by all three directions. */

const GEM_W = 332, GEM_H = 690;

// Minimal stroke icon set for UI chrome.
const GEM_ICONS = {
  search: 'M11 11l4 4M7.5 13a5.5 5.5 0 100-11 5.5 5.5 0 000 11z',
  back: 'M12.5 4L6 10.5l6.5 6.5',
  close: 'M5 5l10 10M15 5L5 15',
  heart: 'M10 17s-6-4-8-7.5C0.7 6.8 2 4 4.8 4c1.6 0 2.8 1 3.7 2.2C9.4 5 10.6 4 12.2 4 15 4 16.3 6.8 15 9.5 13 13 10 17 10 17z',
  share: 'M14 6.5a2 2 0 10-1.9-2.6L7.9 6.2a2 2 0 100 3.6l4.2 2.3a2 2 0 10.7-1.3L8.6 8.5a2 2 0 000-1l4.2-2.3c.3.2.7.3 1.2.3z',
  route: 'M6 16V8a2 2 0 012-2h4M6 16a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm8-12a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
  plus: 'M10 4v12M4 10h12',
  filter: 'M3 5h14M6 10h8M9 15h2',
  location: 'M10 18s6-5.2 6-9.5A6 6 0 104 8.5C4 12.8 10 18 10 18zm0-7a2.2 2.2 0 100-4.4A2.2 2.2 0 0010 11z',
  star: 'M10 2.5l2.2 4.6 5 .6-3.7 3.5 1 5-4.5-2.5L5.5 16l1-5L2.8 7.7l5-.6z',
  chevron: 'M7.5 4L13 10l-5.5 6',
  chevronUp: 'M4 12l6-5.5L16 12',
  check: 'M4 10.5l4 4 8-9',
  camera: 'M3 7a2 2 0 012-2h1.5l1-1.5h5l1 1.5H18a0 0 0 010 0 2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2zm7 8a3 3 0 100-6 3 3 0 000 6z',
  clock: 'M10 5v5l3 2M10 17.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15z',
  pin: 'M10 18s6-5.2 6-9.5A6 6 0 104 8.5C4 12.8 10 18 10 18z',
  bookmark: 'M5 3.5h10v14l-5-3.5-5 3.5z',
  compass: 'M10 17.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15zm3-10.5l-2 4.5-4.5 2 2-4.5z',
  layers: 'M10 3l7 4-7 4-7-4zM3 11l7 4 7-4',
  sliders: 'M4 6h12M4 14h12M8 6v0m0-2v4m4 10v0m0-2v4',
};

function UIcon({ name, size = 20, stroke = 'currentColor', strokeWidth = 1.7, fill = 'none', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={fill} stroke={stroke}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', ...style }}>
      <path d={GEM_ICONS[name]} />
    </svg>
  );
}

// Solid-fill heart (for active saved state).
function HeartFilled({ size = 18, color = '#e0567a' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={color} style={{ display: 'block' }}>
      <path d="M10 17.5s-6.5-4.3-8.5-8C0.2 6.8 1.6 3.5 4.9 3.5c1.8 0 3.2 1.1 4.1 2.4.9-1.3 2.3-2.4 4.1-2.4 3.3 0 4.7 3.3 3.4 6-2 3.7-8.5 8-8.5 8z" />
    </svg>
  );
}

// Striped photo placeholder with a monospace caption (no fake imagery).
function PhotoSlot({ label = 'photo', w = '100%', h = 140, tint = '#c9cdd6', radius = 0, dark = false, style = {} }) {
  const stripe = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.045)';
  const base = dark ? '#2a3140' : tint;
  return (
    <div style={{
      width: w, height: h, borderRadius: radius, position: 'relative', overflow: 'hidden',
      background: `repeating-linear-gradient(45deg, ${base}, ${base} 9px, ${stripe} 9px, ${stripe} 18px)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', ...style,
    }}>
      <span style={{
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: 9.5, letterSpacing: '0.04em',
        color: dark ? 'rgba(255,255,255,0.62)' : 'rgba(0,0,0,0.4)', background: dark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.72)',
        padding: '2px 7px', borderRadius: 100, textTransform: 'uppercase', fontWeight: 600,
      }}>{label}</span>
    </div>
  );
}

// Status bar — light or dark content.
function StatusBar({ dark = false, time = '9:41' }) {
  const c = dark ? '#11151c' : '#fff';
  return (
    <div style={{
      height: 26, padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      color: c, fontWeight: 700, fontSize: 12.5, position: 'relative', zIndex: 30, flex: '0 0 auto',
    }}>
      <span style={{ letterSpacing: '0.02em' }}>{time}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg width="16" height="11" viewBox="0 0 18 12" fill={c}><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="5" y="4.5" width="3" height="7.5" rx="1"/><rect x="10" y="2" width="3" height="10" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1" opacity="0.4"/></svg>
        <svg width="16" height="11" viewBox="0 0 18 12" fill={c}><path d="M9 2.5C6.4 2.5 4 3.5 2.2 5.2L9 12l6.8-6.8C14 3.5 11.6 2.5 9 2.5z" opacity="0.92"/></svg>
        <svg width="24" height="12" viewBox="0 0 26 13" fill="none"><rect x="0.6" y="0.6" width="21" height="11.8" rx="3" stroke={c} strokeWidth="1.1" opacity="0.5"/><rect x="2.2" y="2.2" width="15" height="8.6" rx="1.6" fill={c}/><rect x="23" y="4" width="2" height="5" rx="1" fill={c} opacity="0.5"/></svg>
      </div>
    </div>
  );
}

function HomeIndicator({ dark = false }) {
  return (
    <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', position: 'relative', zIndex: 30 }}>
      <div style={{ width: 116, height: 4.5, borderRadius: 100, background: dark ? 'rgba(17,21,28,0.32)' : 'rgba(255,255,255,0.9)' }} />
    </div>
  );
}

// PhoneScreen — the artboard body. Fills the artboard; children stack.
function PhoneScreen({ bg = '#fff', children, style = {} }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: bg, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'inherit', ...style,
    }}>{children}</div>
  );
}

// Small avatar dot.
function Avatar({ size = 24, label = 'M', bg = '#1b2336', color = '#fff' }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color, display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 700, flex: '0 0 auto' }}>{label}</div>
  );
}

Object.assign(window, { GEM_W, GEM_H, GEM_ICONS, UIcon, HeartFilled, PhotoSlot, StatusBar, HomeIndicator, PhoneScreen, Avatar });
