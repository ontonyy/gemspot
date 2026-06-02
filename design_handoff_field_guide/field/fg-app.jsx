/* GemSpot Field Guide — app shell, explore (desktop + mobile), detail, states */
const { useState, useEffect, useMemo, useRef } = React;

/* ── minimal line icons (stroke 1.6, consistent) ───────────────────────── */
const Ic = {
  search: <g><circle cx="11" cy="11" r="6.4"/><path d="M20 20l-3.8-3.8"/></g>,
  flag:   <g><path d="M6 21V4M6 4h11l-2.2 4L17 12H6"/></g>,
  share:  <g><path d="M12 14V4M12 4l-3.5 3.5M12 4l3.5 3.5"/><path d="M5 13v6a1 1 0 001 1h12a1 1 0 001-1v-6"/></g>,
  arrow:  <g><path d="M5 12h13M13 6l6 6-6 6"/></g>,
  layers: <g><path d="M12 4l8 4-8 4-8-4 8-4z"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4"/></g>,
  plus:   <g><path d="M12 5v14M5 12h14"/></g>,
  minus:  <g><path d="M5 12h14"/></g>,
  loc:    <g><path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></g>,
  x:      <g><path d="M6 6l12 12M18 6L6 18"/></g>,
  back:   <g><path d="M19 12H5M11 6l-6 6 6 6"/></g>,
  sort:   <g><path d="M7 5v14M7 19l-3-3M7 5l3 3M17 19V5M17 5l3 3M17 5l-3 3"/></g>,
  star:   <g><path d="M12 4l2.3 4.7 5.2.8-3.8 3.7.9 5.1L12 16.7 7.4 18l.9-5.1-3.8-3.7 5.2-.8z"/></g>,
  pin:    <g><path d="M12 21s6-5.5 6-10a6 6 0 10-12 0c0 4.5 6 10 6 10z"/><circle cx="12" cy="11" r="2"/></g>,
  book:   <g><path d="M5 5a2 2 0 012-2h11v16H7a2 2 0 00-2 2V5z"/><path d="M5 19a2 2 0 012-2h11"/></g>,
  user:   <g><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c.6-3.5 3.2-5.4 6.5-5.4S17.9 16.5 18.5 20"/></g>,
  check:  <g><path d="M5 12l5 5 9-11"/></g>,
  cog:    <g><circle cx="12" cy="12" r="2.6"/><path d="M12 3.6v2.2M12 18.2v2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M3.6 12h2.2M18.2 12h2.2M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/></g>,
  shield: <g><path d="M12 3.5l6.5 2.4v5.1c0 4-2.7 7.1-6.5 8.5-3.8-1.4-6.5-4.5-6.5-8.5V5.9L12 3.5z"/></g>,
  out:    <g><path d="M14 7V5a1 1 0 00-1-1H6a1 1 0 00-1 1v14a1 1 0 001 1h7a1 1 0 001-1v-2"/><path d="M10 12h10M16 8l4 4-4 4"/></g>,
  chev:   <g><path d="M6 9l6 6 6-6"/></g>,
};
function Icon({ d, size = 18, sw = 1.6 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{ display: 'block' }}>{d}</svg>;
}

/* ── save / collector's stamp ──────────────────────────────────────────── */
function Stamp({ saved, onClick, light }) {
  return (
    <button className="fg-stamp" data-saved={saved} data-light={light}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={saved ? 'Collected' : 'Save spot'} title={saved ? 'Collected' : 'Save'}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
        <path d="M6 21V5a2 2 0 012-2h8a2 2 0 012 2v16l-6-3.6L6 21z" />
      </svg>
    </button>
  );
}

/* ── account dropdown ──────────────────────────────────────────────────── */
function AccountMenu({ onAdd, setRoute }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const go = (fn) => () => { setOpen(false); fn && fn(); };
  return (
    <div className="fg-acct" ref={ref}>
      <button className="fg-avatar" data-on={open} onClick={() => setOpen((v) => !v)} aria-haspopup="true" aria-expanded={open}>M</button>
      {open && (
        <div className="fg-menu" role="menu">
          <div className="fg-menu-head">
            <span className="fg-avatar fg-avatar-sm">M</span>
            <div>
              <b>Maris Tamm</b>
              <small className="mono">Signed in · Tallinn</small>
            </div>
          </div>
          <div className="fg-menu-sec">
            <button role="menuitem" onClick={go()}><Icon d={Ic.user} size={16} />Profile</button>
            <button role="menuitem" onClick={go(() => setRoute('saved'))}><Icon d={Ic.flag} size={16} />Saved spots</button>
            <button role="menuitem" onClick={go(onAdd)}><Icon d={Ic.plus} size={16} sw={2} />Add a spot</button>
          </div>
          <div className="fg-menu-sec">
            <button role="menuitem" onClick={go()}><Icon d={Ic.shield} size={16} />Admin panel</button>
            <button role="menuitem" onClick={go()}><Icon d={Ic.cog} size={16} />Settings</button>
          </div>
          <div className="fg-menu-sec">
            <button role="menuitem" className="fg-menu-out" onClick={go()}><Icon d={Ic.out} size={16} />Sign out</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── top bar ───────────────────────────────────────────────────────────── */
function TopBar({ route, setRoute, savedCount, query, setQuery, onAdd }) {
  return (
    <header className="fg-top">
      <button className="fg-brand" onClick={() => setRoute('home')} aria-label="GemSpot — home">
        <div className="fg-logo" />
        <div>
          <div className="fg-wordmark">Gem<span>Spot</span></div>
          <small>Tallinn · Field Guide</small>
        </div>
      </button>
      <nav className="fg-nav">
        {[['explore', 'Explore'], ['saved', 'Saved'], ['guides', 'Guides']].map(([k, l]) => (
          <button key={k} data-on={route === k} onClick={() => setRoute(k)}>
            {l}{k === 'saved' && savedCount > 0 && <span className="fg-navcount">{savedCount}</span>}
          </button>
        ))}
      </nav>
      <div className="fg-search">
        <span style={{ color: 'var(--ink-3)' }}><Icon d={Ic.search} size={16} /></span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search spots, areas…" />
      </div>
      <div className="fg-top-r">
        <button className="fg-btn fg-btn-solid" onClick={onAdd}><Icon d={Ic.plus} size={16} sw={2} />Add a spot</button>
        <AccountMenu onAdd={onAdd} setRoute={setRoute} />
      </div>
    </header>
  );
}

/* ── legend / category filter ──────────────────────────────────────────── */
function Legend({ active, toggle, clearAll, compact }) {
  const allOn = active.size === 0;
  return (
    <div className={compact ? 'fg-m-keys' : 'fg-keys'}>
      <button className="fg-key fg-key-all" data-on={allOn} onClick={clearAll}>All</button>
      {FG_CATS.map((c) => (
        <button key={c.id} className="fg-key" data-on={active.has(c.id)}
          style={{ '--kc': catColor(c.id) }} onClick={() => toggle(c.id)}>
          <span className="fg-key-dot" />{c.short}
        </button>
      ))}
    </div>
  );
}

/* ── specimen card ─────────────────────────────────────────────────────── */
function SpecimenCard({ p, saved, onSave, onOpen, active, onHover }) {
  return (
    <div className="fg-card" data-active={active} style={{ '--cc': catColor(p.cat) }} role="button" tabIndex={0}
      onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
      onMouseEnter={() => onHover(p.id)} onMouseLeave={() => onHover(null)}>
      <span className="fg-card-no">№{p.no}</span>
      <div className="fg-thumb">
        <FgPhoto cat={p.cat} glyph />
        <span className="fg-thumb-cat" style={{ background: catColor(p.cat) }}>
          <FgGlyph cat={p.cat} size={11} />
        </span>
      </div>
      <div className="fg-card-body">
        <h3>{p.name}</h3>
        <div className="fg-card-meta">
          <span className="cat">{FG_CAT[p.cat].short}</span>
          <span className="dot" /><span>{p.area}</span>
          <span className="dot" /><span>{p.km.toFixed(1)}km</span>
        </div>
        <div className="fg-tags">
          {p.tags.slice(0, 3).map((t) => <span key={t} className="fg-tag">{t}</span>)}
        </div>
      </div>
      <div className="fg-card-save"><Stamp saved={saved} onClick={onSave} /></div>
    </div>
  );
}

/* ── list / skeleton / empty ───────────────────────────────────────────── */
function SkeletonList() {
  return (
    <div>{Array.from({ length: 6 }).map((_, i) => (
      <div className="fg-skel-row" key={i}>
        <span className="fg-skel" style={{ width: 18, height: 11 }} />
        <span className="fg-skel" style={{ width: 64, height: 64 }} />
        <div className="b">
          <span className="fg-skel" style={{ width: '62%', height: 14 }} />
          <span className="fg-skel" style={{ width: '82%', height: 10 }} />
          <span className="fg-skel" style={{ width: 100, height: 16 }} />
        </div>
      </div>
    ))}</div>
  );
}
function EmptyState({ onReset }) {
  return (
    <div className="fg-empty">
      <div className="fg-empty-mark"><span style={{ color: 'var(--ink-3)' }}><Icon d={Ic.pin} size={22} /></span></div>
      <div className="kicker">No specimens found</div>
      <h3>Nothing matches this filter</h3>
      <p>No spots in the current categories fall inside the map view. Try widening the legend or panning the map.</p>
      <div className="fg-empty-btns"><button className="fg-btn" onClick={onReset}>Reset legend</button></div>
    </div>
  );
}

/* ── detail panel ──────────────────────────────────────────────────────── */
function Detail({ p, saved, onSave, onClose, mobile }) {
  const [shot, setShot] = useState(0);
  if (!p) return null;
  return (
    <aside className="fg-detail" style={{ '--cc': catColor(p.cat), ...(mobile ? { position: 'absolute', width: '100%', borderRight: 'none', boxShadow: 'none', zIndex: 45 } : {}) }}>
      <div className="fg-detail-hero">
        <FgPhoto cat={p.cat} glyph={false} label={`PHOTO ${shot + 1}/3 — drop image`} className="" />
        <div className="fg-detail-top">
          <button className="fg-iconbtn" onClick={onClose}><Icon d={Ic.back} size={18} /></button>
          <button className="fg-iconbtn"><Icon d={Ic.share} size={17} /></button>
        </div>
        <span className="fg-detail-cattag"><FgGlyph cat={p.cat} size={13} />{FG_CAT[p.cat].label}</span>
        <div className="fg-detail-dots">
          {[0, 1, 2].map((i) => <i key={i} data-on={i === shot} onClick={() => setShot(i)} />)}
        </div>
      </div>
      <div className="fg-detail-body">
        <div className="fg-detail-no">Specimen №{p.no} · Tallinn</div>
        <h1>{p.name}</h1>
        <div className="fg-detail-loc">
          <Icon d={Ic.pin} size={13} />{p.area}<span className="dot" />{p.km.toFixed(1)}km away
          <span className="dot" /><span style={{ color: 'var(--ink-3)' }}>{p.saves} saves</span>
        </div>
        <div className="fg-byline">
          spotted by <b>@{p.by}</b>
          <span className="fg-verified"><span className="tick"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg></span>verified {p.verified}</span>
        </div>
        <p className="fg-note">{p.note}</p>

        <div className="fg-notes-h">Field notes</div>
        <div className="fg-facts">
          <div className="fg-fact"><span className="k">Access</span><span className="v">{p.cost}</span></div>
          <div className="fg-fact"><span className="k">Lit</span><span className="v">{p.lit}</span></div>
          <div className="fg-fact"><span className="k">Best</span><span className="v">{p.best}</span></div>
        </div>

        <div className="fg-notes-h">Sightings</div>
        <div className="fg-strip">
          <FgPhoto cat={p.cat} glyph label="DROP" />
          <FgPhoto cat={p.cat} glyph label="DROP" />
        </div>
      </div>
      <div className="fg-detail-bar">
        <button className="fg-btn fg-savebar" data-saved={saved} onClick={onSave}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M6 21V5a2 2 0 012-2h8a2 2 0 012 2v16l-6-3.6L6 21z" /></svg>{saved ? 'Collected' : 'Save'}
        </button>
        <button className="fg-btn fg-btn-solid fg-btn-block"><Icon d={Ic.arrow} size={17} sw={2} />Directions</button>
      </div>
    </aside>
  );
}

/* ── map view ──────────────────────────────────────────────────────────── */
function MapView({ places, saved, selectedId, onSelect, count }) {
  const [layers, setLayers] = useState(true);
  return (
    <div className="fg-map">
      <FgMapCanvas />
      {layers && places.map((p) => (
        <FgPin key={p.id} place={p} selected={p.id === selectedId} saved={saved.has(p.id)}
          onClick={() => onSelect(p.id)} />
      ))}
      <div className="fg-me" style={{ left: '41%', top: '50%' }}><span /></div>

      <div className="fg-mapstamp">
        <b>Central Tallinn</b>
        <small className="mono">{count} specimens mapped · 1:12 000</small>
      </div>

      <div className="fg-mapctl">
        <button><Icon d={Ic.plus} size={17} /></button>
        <button><Icon d={Ic.minus} size={17} /></button>
        <button data-on={layers} onClick={() => setLayers(!layers)} title="Toggle pins"><Icon d={Ic.layers} size={17} /></button>
        <button title="Locate me"><Icon d={Ic.loc} size={17} /></button>
      </div>
    </div>
  );
}

/* ── desktop explore ───────────────────────────────────────────────────── */
function DesktopExplore(s) {
  return (
    <div className="fg-explore">
      <div className="fg-rail">
        <div className="fg-legend">
          <div className="fg-legend-h">
            <span className="kicker">Legend · filter</span>
            {s.active.size > 0 && <button className="fg-sort" onClick={s.clearAll}>Clear</button>}
          </div>
          <Legend active={s.active} toggle={s.toggle} clearAll={s.clearAll} />
        </div>
        <div className="fg-rail-head">
          <div>
            <div className="count"><b className="mono">{s.list.length}</b> spots nearby</div>
            <div className="sub">{s.active.size ? [...s.active].map((c) => FG_CAT[c].short).join(' · ') : 'All categories'} · sorted by distance</div>
          </div>
          <button className="fg-sort"><Icon d={Ic.sort} size={13} />Near</button>
        </div>
        <div className="fg-rail-list">
          {s.loading ? <SkeletonList />
            : s.list.length === 0 ? <EmptyState onReset={s.clearAll} />
              : s.list.map((p) => (
                <SpecimenCard key={p.id} p={p} saved={s.saved.has(p.id)} active={p.id === s.hoverId || p.id === s.detailId}
                  onSave={() => s.toggleSave(p.id)} onOpen={() => s.openDetail(p.id)} onHover={s.setHoverId} />
              ))}
        </div>
      </div>
      {s.detailId && (
        <Detail p={s.detailPlace} saved={s.saved.has(s.detailId)}
          onSave={() => s.toggleSave(s.detailId)} onClose={s.closeDetail} />
      )}
      <div className="fg-mapwrap">
        {s.loading && <div className="fg-maploading"><span className="fg-pulse" />Loading Tallinn…</div>}
        <MapView places={s.list} saved={s.saved} count={s.list.length}
          selectedId={s.detailId || s.hoverId} onSelect={s.openDetail} />
      </div>
    </div>
  );
}

/* ── mobile explore ────────────────────────────────────────────────────── */
function MobileExplore(s) {
  const [sheet, setSheet] = useState('half');
  return (
    <div className="fg-explore-m">
      <div className="fg-m-stage">
        <div className="fg-m-map" style={{ position: 'absolute', inset: 0 }}>
          <MapView places={s.list} saved={s.saved} count={s.list.length}
            selectedId={s.detailId || s.hoverId} onSelect={s.openDetail} />
        </div>
        <div className="fg-m-legend">
          <Legend active={s.active} toggle={s.toggle} clearAll={s.clearAll} compact />
        </div>

        <div className="fg-sheet" data-state={sheet}>
          <div className="fg-sheet-grab" onClick={() => setSheet(sheet === 'full' ? 'half' : sheet === 'half' ? 'peek' : 'full')}>
            <span />
          </div>
          <div className="fg-sheet-head">
            <div>
              <div className="count" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
                <b className="mono">{s.list.length}</b> spots nearby
              </div>
              <div className="sub kicker" style={{ marginTop: 3 }}>Sorted by distance</div>
            </div>
            <button className="fg-sort"><Icon d={Ic.sort} size={13} />Near</button>
          </div>
          <div className="fg-rail-list">
            {s.loading ? <SkeletonList />
              : s.list.length === 0 ? <EmptyState onReset={s.clearAll} />
                : s.list.map((p) => (
                  <SpecimenCard key={p.id} p={p} saved={s.saved.has(p.id)} active={p.id === s.detailId}
                    onSave={() => s.toggleSave(p.id)} onOpen={() => s.openDetail(p.id)} onHover={() => {}} />
                ))}
          </div>
        </div>

        {s.detailId && (
          <Detail p={s.detailPlace} saved={s.saved.has(s.detailId)} mobile
            onSave={() => s.toggleSave(s.detailId)} onClose={s.closeDetail} />
        )}
      </div>

      <MobileNav route={s.route} setRoute={s.setRoute} onAdd={s.onAdd} />
    </div>
  );
}

/* ── mobile bottom nav (shared by explore + guides) ────────────────────── */
function MobileNav({ route, setRoute, onAdd }) {
  return (
    <nav className="fg-mobnav">
      {[['explore', Ic.pin, 'Explore'], ['saved', Ic.flag, 'Saved']].map(([k, d, l]) => (
        <button key={k} data-on={route === k} onClick={() => setRoute(k)}>
          <span className="fg-mobnav-ic"><Icon d={d} size={19} /></span>{l}
        </button>
      ))}
      <button onClick={onAdd}><span className="fg-mobnav-ic fg-mobnav-fab" style={{ width: 38, height: 32, marginTop: -2 }}><Icon d={Ic.plus} size={18} sw={2} /></span>Add</button>
      {[['guides', Ic.book, 'Guides'], ['you', Ic.user, 'You']].map(([k, d, l]) => (
        <button key={k} data-on={route === k} onClick={() => setRoute(k)}>
          <span className="fg-mobnav-ic"><Icon d={d} size={19} /></span>{l}
        </button>
      ))}
    </nav>
  );
}

/* ── add-a-spot modal ──────────────────────────────────────────────────── */
const FG_ADD_TAGS = ['Free', 'Lit', 'Seasonal', 'Shaded', 'Sunset', 'Coast', 'Full court'];

function AddSpotModal({ onClose, onSubmit }) {
  const [cat, setCat] = useState(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState(new Set());
  const [done, setDone] = useState(false);
  const valid = cat && name.trim().length > 1;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const toggleTag = (t) => setTags((s) => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n; });
  const submit = () => { if (!valid) return; setDone(true); onSubmit(); };

  return (
    <div className="fg-modal-scrim" onMouseDown={onClose}>
      <div className="fg-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
        style={cat ? { '--cc': catColor(cat) } : undefined}>
        {done ? (
          <div className="fg-add-done">
            <div className="fg-add-stamp"><span className="fg-pending-badge mono">Pending</span></div>
            <div className="kicker">Submission received</div>
            <h2>Sent for review</h2>
            <p>Thanks for the find. A local reviewer checks every new spot before it appears on the map — usually within a day. We'll let you know when <b>{name.trim()}</b> goes live.</p>
            <div className="fg-add-actions">
              <button className="fg-btn" onClick={() => { setDone(false); setCat(null); setName(''); setNote(''); setTags(new Set()); }}>Add another</button>
              <button className="fg-btn fg-btn-solid" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <div className="fg-modal-head">
              <div>
                <div className="kicker">New specimen</div>
                <h2>Add a spot</h2>
              </div>
              <button className="fg-iconbtn" onClick={onClose} aria-label="Close"><Icon d={Ic.x} size={18} /></button>
            </div>
            <div className="fg-modal-body">
              <div className="fg-add-loc">
                <span className="fg-add-loc-ic"><Icon d={Ic.pin} size={17} /></span>
                <div>
                  <b>Drop a pin on the map</b>
                  <small className="mono">Tap the map to set the exact location</small>
                </div>
                <span className="fg-add-loc-set mono">Set</span>
              </div>

              <div className="fg-field">
                <label className="fg-flabel">Category</label>
                <div className="fg-add-cats">
                  {FG_CATS.map((c) => (
                    <button key={c.id} type="button" className="fg-add-cat" data-on={cat === c.id}
                      style={{ '--kc': catColor(c.id) }} onClick={() => setCat(c.id)}>
                      <span className="fg-add-cat-disc"><FgGlyph cat={c.id} size={18} /></span>
                      {c.short}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fg-field">
                <label className="fg-flabel" htmlFor="fg-add-name">Name</label>
                <input id="fg-add-name" className="fg-input" value={name} maxLength={48}
                  onChange={(e) => setName(e.target.value)} placeholder="e.g. Snelli pond tables" />
              </div>

              <div className="fg-field">
                <label className="fg-flabel" htmlFor="fg-add-note">Field note <span className="fg-flabel-opt">optional</span></label>
                <textarea id="fg-add-note" className="fg-input fg-textarea" value={note} maxLength={240} rows={3}
                  onChange={(e) => setNote(e.target.value)} placeholder="What makes it worth the trip? Best time, surface, who it's good for…" />
              </div>

              <div className="fg-field">
                <label className="fg-flabel">Tags <span className="fg-flabel-opt">optional</span></label>
                <div className="fg-add-tags">
                  {FG_ADD_TAGS.map((t) => (
                    <button key={t} type="button" className="fg-tag fg-tag-pick" data-on={tags.has(t)} onClick={() => toggleTag(t)}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="fg-modal-foot">
              <small className="mono">Goes to review · not published instantly</small>
              <button className="fg-btn fg-btn-solid" disabled={!valid} onClick={submit}>Submit for review</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── guides / curated collections ──────────────────────────────────────── */
const FG_GUIDES = [
  { id: 'sunset', cat: 'scenic',      title: 'Best sunset spots',   blurb: 'West-facing terraces and rooftops for golden hour over the bay.', area: 'Across Tallinn' },
  { id: 'hoops',  cat: 'basketball',  title: 'Hoops in the centre', blurb: 'Fresh-net courts within a short walk of Kesklinn.',               area: 'Kesklinn · Toompea' },
  { id: 'sakura', cat: 'sakura',      title: 'Spring sakura trail', blurb: 'A ten-day window of cherry blossom, ordered for one good walk.',   area: 'Seasonal · late Apr' },
  { id: 'ping',   cat: 'tabletennis', title: 'Shaded ping-pong',    blurb: 'Outdoor tables that stay cool through the summer afternoon.',      area: 'Kesklinn' },
  { id: 'pitch',  cat: 'football',    title: 'Pitches for pickup',  blurb: 'Open grass and courts when the clubs aren\'t training.',           area: 'Kristiine & out' },
];

function GuideCard({ g, count, onOpen }) {
  return (
    <button className="fg-guide" style={{ '--cc': catColor(g.cat) }} onClick={() => onOpen(g)}>
      <div className="fg-guide-cover">
        <FgPhoto cat={g.cat} glyph label={`${count} spots`} />
        <span className="fg-guide-cat"><FgGlyph cat={g.cat} size={12} />{FG_CAT[g.cat].short}</span>
      </div>
      <div className="fg-guide-body">
        <h3>{g.title}</h3>
        <p>{g.blurb}</p>
        <div className="fg-guide-meta mono">
          <span>{g.area}</span><span className="dot" /><span>{count} spots</span>
          <span className="fg-guide-go"><Icon d={Ic.arrow} size={14} sw={2} /></span>
        </div>
      </div>
    </button>
  );
}

function GuidesPage(s) {
  const count = (cat) => FG_PLACES.filter((p) => p.cat === cat).length;
  return (
    <div className="fg-guides" data-mobile={!!s.mobile}>
      <div className="fg-guides-scroll">
        <div className="fg-guides-head">
          <div className="kicker">Curated by locals</div>
          <h1>Field guides</h1>
          <p>Hand-picked collections — a starting point when you don't know where to look. Open one to filter the map to its spots.</p>
        </div>
        <div className="fg-guides-grid">
          {FG_GUIDES.map((g) => <GuideCard key={g.id} g={g} count={count(g.cat)} onOpen={s.openGuide} />)}
        </div>
      </div>
      {s.mobile && <MobileNav route={s.route} setRoute={s.setRoute} onAdd={s.onAdd} />}
    </div>
  );
}

/* ── landing / home (public "about" page) ──────────────────────────────── */
const FG_STEPS = [
  { n: '01', ic: 'loc',  t: 'Discover', d: 'Browse the map by what you feel like — a sunset, a pickup game, a quiet table.' },
  { n: '02', ic: 'book', t: 'Save',     d: 'Keep the gems you love in one list and pull up directions when you head out.' },
  { n: '03', ic: 'plus', t: 'Add',      d: 'Spotted something worth sharing? Add it — a local reviewer checks every pin.' },
];

function LandingPage(s) {
  const featured = [3, 10, 5, 8].map((id) => FG_PLACES.find((p) => p.id === id));
  const stats = [
    { n: String(FG_PLACES.length), l: 'specimens mapped' },
    { n: String(FG_CATS.length), l: 'categories' },
    { n: '100%', l: 'locally spotted' },
  ];
  const openSpot = (id) => { s.openDetail(id); s.setRoute('explore'); };
  return (
    <div className="fg-home" data-mobile={!!s.mobile}>
      <div className="fg-home-scroll">
        {/* HERO */}
        <section className="fg-hero">
          <div className="fg-hero-copy">
            <span className="kicker">Tallinn · local discovery</span>
            <h1>Hidden city gems, spotted by locals.</h1>
            <p>Find scenic viewpoints, seasonal blossoms and places to play — on a map built for discovery, not directions.</p>
            <div className="fg-hero-cta">
              <button className="fg-btn fg-btn-solid fg-btn-lg" onClick={() => s.setRoute('explore')}><Icon d={Ic.pin} size={17} sw={1.8} />Explore the map</button>
              <button className="fg-btn fg-btn-lg" onClick={s.onAdd}><Icon d={Ic.plus} size={16} sw={2} />Add a spot</button>
            </div>
            <div className="fg-hero-stats">
              {stats.map((st) => (
                <div key={st.l}><b className="mono">{st.n}</b><span className="mono">{st.l}</span></div>
              ))}
            </div>
          </div>
          <button className="fg-hero-map" onClick={() => s.setRoute('explore')} aria-label="Open the live map">
            <FgMapCanvas />
            <div className="fg-hero-pins">
              {FG_PLACES.slice(0, 7).map((p) => (
                <span key={p.id} className="fg-hero-pin" style={{ left: p.x + '%', top: p.y + '%', '--pc': catColor(p.cat) }}>
                  <FgGlyph cat={p.cat} size={13} />
                </span>
              ))}
            </div>
            <span className="fg-hero-map-cta mono"><Icon d={Ic.loc} size={14} />Open the live map</span>
          </button>
        </section>

        {/* CATEGORIES */}
        <section className="fg-sec">
          <div className="fg-sec-head">
            <div className="kicker">The taxonomy</div>
            <h2>Find your kind of spot</h2>
            <p>Five categories, each with its own ink and marker on the map.</p>
          </div>
          <div className="fg-home-cats">
            {FG_CATS.map((c) => (
              <button key={c.id} className="fg-home-cat" style={{ '--cc': catColor(c.id) }} onClick={() => s.pickCat(c.id)}>
                <span className="fg-home-cat-ic"><FgGlyph cat={c.id} size={22} /></span>
                <span className="fg-home-cat-name">{c.label}</span>
                <span className="fg-home-cat-go"><Icon d={Ic.arrow} size={14} sw={2} /></span>
              </button>
            ))}
          </div>
        </section>

        {/* SPOTTED THIS WEEK */}
        <section className="fg-sec">
          <div className="fg-sec-head fg-sec-head-row">
            <div>
              <h2>Spotted this week</h2>
              <p>A few favourites from the GemSpot community.</p>
            </div>
            <button className="fg-link mono" onClick={() => s.setRoute('explore')}>See all on the map<Icon d={Ic.arrow} size={13} sw={2} /></button>
          </div>
          <div className="fg-featured-grid">
            {featured.map((p) => (
              <SpecimenCard key={p.id} p={p} saved={s.saved.has(p.id)} active={false}
                onSave={() => s.toggleSave(p.id)} onOpen={() => openSpot(p.id)} onHover={() => {}} />
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="fg-sec fg-how">
          <div className="fg-sec-head"><div className="kicker">Three steps</div><h2>How GemSpot works</h2></div>
          <div className="fg-how-grid">
            {FG_STEPS.map((st) => (
              <div key={st.t} className="fg-how-step">
                <span className="fg-how-num mono">{st.n}</span>
                <span className="fg-how-ic"><Icon d={Ic[st.ic]} size={22} /></span>
                <h3>{st.t}</h3>
                <p>{st.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA BAND */}
        <section className="fg-ctaband">
          <div>
            <div className="kicker" style={{ color: 'color-mix(in oklch,var(--paper) 60%,transparent)' }}>Contribute</div>
            <h2>Know a spot we're missing?</h2>
            <p>Put it on the map for the rest of Tallinn.</p>
          </div>
          <button className="fg-btn fg-btn-lg fg-ctaband-btn" onClick={s.onAdd}><Icon d={Ic.plus} size={16} sw={2} />Add a spot</button>
        </section>

        {/* FOOTER */}
        <footer className="fg-foot">
          <div className="fg-foot-top">
            <div className="fg-brand fg-foot-brand">
              <div className="fg-logo" />
              <div>
                <div className="fg-wordmark">Gem<span>Spot</span></div>
                <small>Tallinn · Field Guide</small>
              </div>
            </div>
            <div className="fg-foot-cols">
              <div>
                <h4>Explore</h4>
                <a onClick={() => s.setRoute('explore')}>The map</a>
                <a onClick={() => s.setRoute('guides')}>Guides</a>
                <a onClick={() => s.setRoute('saved')}>Saved spots</a>
              </div>
              <div>
                <h4>Contribute</h4>
                <a onClick={s.onAdd}>Add a spot</a>
                <a onClick={s.onAdd}>Report an issue</a>
              </div>
              <div>
                <h4>GemSpot</h4>
                <a>About</a>
                <a>Bring GemSpot to your city</a>
                <a>Privacy</a>
              </div>
            </div>
          </div>
          <div className="fg-foot-bot mono">
            <span>© 2026 GemSpot · Made in Tallinn</span>
            <span>A local discovery map, not a navigation app.</span>
          </div>
        </footer>
      </div>
      {s.mobile && <MobileNav route={s.route} setRoute={s.setRoute} onAdd={s.onAdd} />}
    </div>
  );
}

/* ── root ──────────────────────────────────────────────────────────────── */
function App() {
  const [route, setRoute] = useState('home');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(new Set());
  const [saved, setSaved] = useState(new Set([3, 10]));
  const [hoverId, setHoverId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vp, setVp] = useState('desktop');
  const [narrow, setNarrow] = useState(window.innerWidth < 980);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(null);
  const toastT = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 950);
    const onR = () => setNarrow(window.innerWidth < 980);
    window.addEventListener('resize', onR);
    return () => { clearTimeout(t); window.removeEventListener('resize', onR); };
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 2600);
  };

  const toggle = (id) => setActive((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearAll = () => setActive(new Set());
  const toggleSave = (id) => setSaved((s) => {
    const n = new Set(s); const had = n.has(id); had ? n.delete(id) : n.add(id);
    showToast(had ? 'Removed from collection' : 'Saved to your collection');
    return n;
  });
  const openDetail = (id) => setDetailId(id);
  const closeDetail = () => setDetailId(null);
  const openAdd = () => setAdding(true);
  const pickCat = (cat) => { setActive(new Set([cat])); setRoute('explore'); };
  const openGuide = (g) => { setActive(new Set([g.cat])); setRoute('explore'); showToast('Filtered to ' + FG_CAT[g.cat].short); };

  const base = route === 'saved' ? FG_PLACES.filter((p) => saved.has(p.id)) : FG_PLACES;
  const list = useMemo(() => {
    let r = base;
    if (active.size) r = r.filter((p) => active.has(p.cat));
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter((p) => p.name.toLowerCase().includes(q) || p.area.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) => a.km - b.km);
  }, [base, active, query, route]);

  const detailPlace = FG_PLACES.find((p) => p.id === detailId);
  const s = { route, setRoute, active, toggle, clearAll, saved, toggleSave,
    hoverId, setHoverId, detailId, openDetail, closeDetail, detailPlace, loading, list,
    onAdd: openAdd, openGuide, pickCat };

  const useMobile = vp === 'mobile' || narrow;

  const renderMain = () => {
    if (route === 'home') return <LandingPage {...s} mobile={useMobile} />;
    if (route === 'guides') return <GuidesPage {...s} mobile={useMobile} />;
    return useMobile ? <MobileExplore {...s} /> : <DesktopExplore {...s} />;
  };

  return (
    <div className="fg-shell">
      <TopBar route={route} setRoute={setRoute} savedCount={saved.size} query={query} setQuery={setQuery} onAdd={openAdd} />
      <div className="fg-body">
        {useMobile && !narrow ? (
          <div className="fg-phone-stage">
            <div className="fg-phone">{renderMain()}</div>
          </div>
        ) : (
          renderMain()
        )}
      </div>
      {adding && <AddSpotModal onClose={() => setAdding(false)} onSubmit={() => showToast('Spot submitted for review')} />}
      {toast && <div className="fg-toast" role="status"><span className="fg-toast-tick"><Icon d={Ic.check} size={13} sw={2.4} /></span>{toast}</div>}
      {!narrow && (
        <div className="fg-vp">
          <button data-on={vp === 'desktop'} onClick={() => setVp('desktop')}>Desktop</button>
          <button data-on={vp === 'mobile'} onClick={() => setVp('mobile')}>Mobile</button>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
