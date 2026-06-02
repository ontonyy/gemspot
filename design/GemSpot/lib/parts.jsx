/* GemSpot — adaptive UI parts shared by the mobile screens.
   Card style + button shapes vary by direction config D. */

// Bottom sheet shell with grabber.
function Sheet({ D, children, style = {}, grabber = true, pad = 16 }) {
  return (
    <div style={{
      background: D.color.surface, borderTopLeftRadius: D.radius.sheet, borderTopRightRadius: D.radius.sheet,
      boxShadow: '0 -8px 32px rgba(20,26,40,0.16)', position: 'relative', zIndex: 20,
      paddingBottom: pad, fontFamily: D.font.body, ...style,
    }}>
      {grabber && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 2px' }}>
          <div style={{ width: 40, height: 4.5, borderRadius: 100, background: D.color.line }} />
        </div>
      )}
      {children}
    </div>
  );
}

// Tag pills.
function TagRow({ D, tags, max = 3 }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {tags.slice(0, max).map((t) => (
        <span key={t} style={{
          fontSize: 11, fontWeight: 600, color: D.color.inkSoft, fontFamily: D.font.body,
          background: D.color.surface2, padding: '3px 9px', borderRadius: D.radius.chip,
          border: D.key === 'B' ? `1px solid ${D.color.line}` : 'none',
        }}>{t}</span>
      ))}
    </div>
  );
}

// Action button (filled / ghost / icon).
function ActBtn({ D, label, icon, kind = 'ghost', flex, onWhite = true }) {
  const filled = kind === 'filled';
  const isIcon = kind === 'icon';
  const base = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 44, borderRadius: D.radius.btn, fontWeight: 700, fontSize: 13.5, fontFamily: D.font.body,
    cursor: 'pointer', flex: flex ? '1 1 0' : '0 0 auto',
  };
  if (isIcon) {
    return (
      <div style={{ ...base, width: 44, padding: 0, background: D.color.surface2, color: D.color.ink, border: `1px solid ${D.color.line}` }}>
        <UIcon name={icon} size={19} stroke={D.color.ink} />
      </div>
    );
  }
  return (
    <div style={{
      ...base, padding: '0 16px',
      background: filled ? D.color.accent : D.color.surface,
      color: filled ? (D.color.accentInk || '#fff') : D.color.ink,
      border: filled ? 'none' : `1.5px solid ${D.color.line}`,
      boxShadow: filled ? `0 4px 12px ${D.color.accent}44` : 'none',
    }}>
      {icon && <UIcon name={icon} size={18} stroke={filled ? (D.color.accentInk || '#fff') : D.color.ink} />}
      {label}
    </div>
  );
}

// Category badge (icon dot + label).
function CatBadge({ D, cat, size = 'sm' }) {
  const c = GEM_CAT[cat]; const col = gemCatColor(D, cat);
  const big = size === 'lg';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: big ? 24 : 20, height: big ? 24 : 20, borderRadius: '50%', background: col,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
        <GemGlyph cat={cat} size={big ? 14 : 12} color="#fff" />
      </span>
      <span style={{ fontSize: big ? 13 : 11.5, fontWeight: 700, color: col, fontFamily: D.font.body }}>{c.label}</span>
    </div>
  );
}

// Step progress dots / bar.
function StepDots({ D, total, current }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 5, borderRadius: 100, transition: 'all .2s',
          width: i === current ? 22 : 5,
          background: i <= current ? D.color.accent : D.color.line,
        }} />
      ))}
    </div>
  );
}

// ── PreviewCard — three layouts ─────────────────────────────────────────────
function PreviewCard({ D, sp, onDetail }) {
  if (D.cardStyle === 'editorial') return <PreviewEditorial D={D} sp={sp} />;
  if (D.cardStyle === 'compact') return <PreviewCompact D={D} sp={sp} />;
  return <PreviewImage D={D} sp={sp} />;
}

// A — image-led, friendly
function PreviewImage({ D, sp }) {
  return (
    <div style={{ padding: '4px 16px 0' }}>
      <div style={{ borderRadius: D.radius.card, overflow: 'hidden', position: 'relative', boxShadow: '0 4px 16px rgba(20,26,40,0.08)' }}>
        <PhotoSlot label={`${sp.cat} · photo`} h={156} tint="#cdd6c8" />
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <span style={{ background: 'rgba(255,255,255,0.94)', borderRadius: 100, padding: '5px 11px', display: 'inline-flex' }}>
            <CatBadge D={D} cat={sp.cat} />
          </span>
        </div>
        <div style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UIcon name="heart" size={19} stroke={D.color.ink} />
        </div>
      </div>
      <div style={{ padding: '14px 2px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ fontFamily: D.font.head, fontSize: 19, fontWeight: 700, color: D.color.ink, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{sp.name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '5px 0 10px' }}>
          <span style={{ fontSize: 12.5, color: D.color.inkSoft, fontWeight: 600 }}>{sp.hood}</span>
          <span style={{ width: 3, height: 3, borderRadius: 2, background: D.color.inkFaint }} />
          <SpotMeta D={D} sp={sp} />
        </div>
        <div style={{ marginBottom: 12 }}><TagRow D={D} tags={sp.tags} /></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ActBtn D={D} label="View details" kind="filled" flex />
          <ActBtn D={D} icon="share" kind="icon" />
          <ActBtn D={D} icon="route" kind="icon" />
        </div>
      </div>
    </div>
  );
}

// B — editorial, generous whitespace, serif title
function PreviewEditorial({ D, sp }) {
  return (
    <div style={{ padding: '6px 20px 0' }}>
      <PhotoSlot label={`${sp.cat} · editorial photo`} h={190} tint="#d3d6cf" radius={D.radius.card} />
      <div style={{ paddingTop: 16 }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 10.5, fontWeight: 700, color: gemCatColor(D, sp.cat), marginBottom: 8 }}>
          {GEM_CAT[sp.cat].label} · {sp.hood}
        </div>
        <div style={{ fontFamily: D.font.head, fontSize: 26, fontWeight: 500, color: D.color.ink, lineHeight: 1.08, letterSpacing: '-0.01em', marginBottom: 10 }}>{sp.name}</div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: D.color.inkSoft, fontFamily: D.font.body, marginBottom: 16, fontWeight: 400 }}>{sp.note}</div>
        <div style={{ height: 1, background: D.color.line, margin: '0 0 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SpotMeta D={D} sp={sp} size={13} />
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <UIcon name="heart" size={21} stroke={D.color.ink} />
            <UIcon name="share" size={20} stroke={D.color.ink} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: D.font.body, fontWeight: 700, fontSize: 13.5, color: D.color.accent }}>
              Read <UIcon name="chevron" size={16} stroke={D.color.accent} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// C — compact utility row
function PreviewCompact({ D, sp }) {
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
            <SpotMeta D={D} sp={sp} size={11.5} />
          </div>
          <TagRow D={D} tags={sp.tags} max={3} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <ActBtn D={D} label="Details" kind="filled" flex />
        <ActBtn D={D} label="Route" icon="route" />
        <ActBtn D={D} icon="bookmark" kind="icon" />
      </div>
    </div>
  );
}

Object.assign(window, { Sheet, TagRow, ActBtn, CatBadge, StepDots, PreviewCard, PreviewImage, PreviewEditorial, PreviewCompact });
