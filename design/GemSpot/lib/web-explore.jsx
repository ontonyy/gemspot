/* GemSpot Web — Explore: filter bar, spot cards, desktop split (rail + map),
   mobile (map + bottom sheet), and the spot detail (panel on desktop,
   full-screen on mobile). */

function useMedia(q) {
  const [m, setM] = React.useState(() => window.matchMedia(q).matches);
  React.useEffect(() => {
    const mq = window.matchMedia(q); const fn = () => setM(mq.matches);
    mq.addEventListener('change', fn); return () => mq.removeEventListener('change', fn);
  }, [q]);
  return m;
}

// ── Spot card (rail row + featured tile) ─────────────────────────────────────
function SpotCard({ sp, variant = 'rail' }) {
  const { setSelected, savedIds, hoverId, setHoverId } = useApp();
  if (variant === 'featured') {
    return (
      <div className="gs-card-feat" role="button" tabIndex={0} onClick={() => setSelected(sp.id)}>
        <div className="gs-card-feat-img">
          <Photo cat={sp.cat} h={150} flat />
          <span className="gs-card-feat-cat"><GemGlyph cat={sp.cat} size={13} color="#fff" /></span>
          <span className="gs-card-feat-save" onClick={(e) => e.stopPropagation()}><SaveButton id={sp.id} size={30} light /></span>
        </div>
        <div className="gs-card-feat-body">
          <h3>{sp.name}</h3>
          <div className="gs-card-meta">
            <span>{sp.hood}</span><i /><span>{distLabel(sp.id)}</span>
            <span className="gs-meta-saves"><UIcon name="bookmark" size={12} stroke={C.color.inkFaint} /> {sp.saves}</span>
          </div>
          <div className="gs-tagrow">{sp.tags.slice(0, 2).map((t) => <Tag key={t}>{t}</Tag>)}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="gs-card-rail" role="button" tabIndex={0}
      onMouseEnter={() => setHoverId(sp.id)} onMouseLeave={() => setHoverId(null)}
      onClick={() => setSelected(sp.id)}>
      <div className="gs-card-rail-img"><Photo cat={sp.cat} h={72} round="10px" />
        <span className="gs-card-rail-cat" style={{ background: catColor(sp.cat) }}><GemGlyph cat={sp.cat} size={11} color="#fff" /></span>
      </div>
      <div className="gs-card-rail-body">
        <h3>{sp.name}</h3>
        <div className="gs-card-meta">
          <span>{sp.hood}</span><i /><span>{distLabel(sp.id)}</span>
          <span className="gs-meta-saves"><UIcon name="bookmark" size={11} stroke={C.color.inkFaint} /> {sp.saves}</span>
        </div>
        <div className="gs-tagrow">{sp.tags.slice(0, 2).map((t) => <Tag key={t}>{t}</Tag>)}</div>
      </div>
      <span className="gs-card-rail-save" onClick={(e) => e.stopPropagation()}><SaveButton id={sp.id} size={32} /></span>
    </div>
  );
}

// ── Filter bar (category chips + All reset) ─────────────────────────────────
function FilterBar({ compact = false }) {
  const { category, setCategory } = useApp();
  const items = [{ id: null, label: 'All' }, ...GEM_CATEGORIES];
  return (
    <div className={'gs-filterbar' + (compact ? ' gs-filterbar-c' : '')}>
      {items.map((c) => {
        const on = category === c.id; const isAll = c.id === null; const col = isAll ? C.color.ink : catColor(c.id);
        return (
          <button key={c.id || 'all'} className="gs-chip" data-on={on}
            style={{ '--cc': col }} onClick={() => setCategory(c.id)}>
            {!isAll && <span className="gs-chip-ic" style={{ background: on ? 'rgba(255,255,255,0.25)' : col }}><GemGlyph cat={c.id} size={13} color="#fff" /></span>}
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Explore ──────────────────────────────────────────────────────────────────
function Explore() {
  const app = useApp();
  const { spots, category, selected, setSelected, locPerm } = app;
  const [hoverId, setHoverId] = React.useState(null);
  const [sheet, setSheet] = React.useState('half');     // mobile: peek | half | full
  const [mapMode, setMapMode] = React.useState(false);   // mobile map/list toggle
  const isMobile = useMedia('(max-width: 899px)');
  app.hoverId = hoverId; app.setHoverId = setHoverId;     // expose to cards

  const list = category ? spots.filter((s) => s.cat === category) : spots;
  const sorted = [...list].sort((a, b) => a.dist - b.dist);
  const catName = category ? catMeta(category).label : 'spots';
  const empty = sorted.length === 0;

  const railHead = (
    <div className="gs-rail-head">
      <div>
        <strong>{sorted.length} {category ? catName.toLowerCase() : 'spots'} nearby</strong>
        <span>Sorted by distance{category ? '' : ' · all categories'}</span>
      </div>
      {category && <button className="gs-clear" onClick={() => app.setCategory(null)}>Clear <UIcon name="close" size={12} stroke={C.color.inkSoft} strokeWidth={2} /></button>}
    </div>
  );

  const listEl = (
    <div className="gs-rail-list">
      {empty ? <EmptyFilter cat={category} onAdd={() => app.go('add')} onClear={() => app.setCategory(null)} />
        : sorted.map((sp) => <SpotCard key={sp.id} sp={sp} />)}
    </div>
  );

  if (isMobile) {
    return (
      <div className="gs-explore-m">
        <div className="gs-m-filter"><FilterBar compact /></div>
        <div className="gs-m-map">
          <WebMap spots={list} selectedId={selected} hoverId={hoverId}
            onSelectSpot={(id) => setSelected(id)} onHoverSpot={setHoverId} showMe={locPerm === 'granted'} />
        </div>
        <div className="gs-sheet" data-state={sheet}>
          <button className="gs-sheet-grab" onClick={() => setSheet(sheet === 'full' ? 'half' : 'full')}><span /></button>
          {railHead}
          {listEl}
        </div>
        {selected && <SpotDetail id={selected} onClose={() => setSelected(null)} fullscreen />}
        {locPerm == null && <LocationPrompt />}
      </div>
    );
  }

  return (
    <div className="gs-explore">
      <aside className="gs-rail">
        <div className="gs-rail-filter"><FilterBar /></div>
        {railHead}
        {listEl}
        {selected && <SpotDetail id={selected} onClose={() => setSelected(null)} />}
      </aside>
      <div className="gs-mapwrap">
        <WebMap spots={list} selectedId={selected} hoverId={hoverId}
          onSelectSpot={(id) => setSelected(id)} onHoverSpot={setHoverId} showMe={locPerm === 'granted'} />
      </div>
      {locPerm == null && <LocationPrompt />}
    </div>
  );
}

// ── Spot detail (panel / fullscreen) ─────────────────────────────────────────
function SpotDetail({ id, onClose, fullscreen = false }) {
  const { spots, savedIds, toggleSave, flashToast } = useApp();
  const sp = spots.find((s) => s.id === id); if (!sp) return null;
  const saved = savedIds.includes(id);
  const [dirOpen, setDirOpen] = React.useState(false);
  const facts = [
    { ic: 'pin', l: sp.hood },
    { ic: sp.free ? 'check' : 'clock', l: sp.free ? 'Free' : 'Paid' },
    { ic: 'bookmark', l: `${sp.saves} saved` },
  ];
  return (
    <div className={'gs-detail' + (fullscreen ? ' gs-detail-full' : ' gs-detail-panel')}>
      <div className="gs-detail-hero">
        <Photo cat={sp.cat} h={fullscreen ? 240 : 210} flat />
        <button className="gs-detail-back" onClick={onClose}><UIcon name={fullscreen ? 'back' : 'close'} size={19} stroke={C.color.ink} /></button>
        <button className="gs-detail-share" onClick={() => flashToast('Link copied')}><UIcon name="share" size={18} stroke={C.color.ink} /></button>
        <div className="gs-detail-dots">{Array.from({ length: Math.min(sp.photos, 4) }).map((_, i) => <i key={i} data-on={i === 0} />)}</div>
      </div>
      <div className="gs-detail-body">
        <CatBadge cat={sp.cat} lg />
        <h1>{sp.name}</h1>
        <div className="gs-detail-by">
          <Avatar size={26} label={sp.by[0]} bg={C.color.accent} />
          <span>Spotted by <b>{sp.by}</b></span>
          {sp.verified && <span className="gs-verified"><UIcon name="check" size={12} stroke="#2f9e5b" strokeWidth={2.2} /> Approved</span>}
          <button className="gs-report" onClick={() => flashToast('Thanks — report sent for review')}>Report</button>
        </div>
        <p className="gs-detail-note">{sp.note}</p>
        <div className="gs-facts">
          {facts.map((f) => <div key={f.l} className="gs-fact"><UIcon name={f.ic} size={17} stroke={C.color.accent} /><span>{f.l}</span></div>)}
        </div>
        <div className="gs-detail-strip">
          {['View', 'Detail', 'Wide'].map((l, i) => <Photo key={i} cat={sp.cat} h={64} round="10px" />)}
        </div>
      </div>
      <div className="gs-detail-bar">
        <button className="gs-btn gs-savebar" data-saved={saved} onClick={() => toggleSave(id)}>
          <UIcon name="bookmark" size={17} stroke={saved ? '#fff' : C.color.ink} fill={saved ? '#fff' : 'none'} />
          {saved ? 'Saved' : 'Save'}
        </button>
        <div className="gs-dir-wrap">
          <button className="gs-btn gs-btn-primary gs-dir-btn" onClick={() => setDirOpen(!dirOpen)}>
            <UIcon name="route" size={17} stroke="#fff" /> Directions
          </button>
          {dirOpen && (
            <div className="gs-dir-menu" onMouseLeave={() => setDirOpen(false)}>
              <a href={directionsURL('apple', sp)} target="_blank" rel="noopener">Apple Maps</a>
              <a href={directionsURL('google', sp)} target="_blank" rel="noopener">Google Maps</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { useMedia, SpotCard, FilterBar, Explore, SpotDetail });
