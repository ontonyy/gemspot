/* GemSpot Web — flows & states: location permission, empty filter, login,
   saved view, add-a-spot (map-click pin + steps + pending), toast. */

// ── Location permission (audit gap: GPS never requested) ─────────────────────
function LocationPrompt() {
  const { setLocPerm } = useApp();
  return (
    <div className="gs-loc">
      <div className="gs-loc-card">
        <span className="gs-loc-ic"><UIcon name="location" size={26} stroke={C.color.accent} /></span>
        <h3>Show spots near you?</h3>
        <p>GemSpot uses your location to sort spots by distance. You can still browse the whole Tallinn map without it.</p>
        <div className="gs-loc-btns">
          <button className="gs-btn gs-btn-primary" onClick={() => setLocPerm('granted')}>Allow location</button>
          <button className="gs-btn gs-btn-ghost" onClick={() => setLocPerm('denied')}>Not now</button>
        </div>
      </div>
    </div>
  );
}

// ── Empty filter result ──────────────────────────────────────────────────────
function EmptyFilter({ cat, onAdd, onClear }) {
  const m = catMeta(cat);
  return (
    <div className="gs-empty">
      <span className="gs-empty-ic" style={{ background: `${catColor(cat)}1a` }}><GemGlyph cat={cat} size={28} color={catColor(cat)} /></span>
      <h3>No {m.label.toLowerCase()} within 5 km</h3>
      <p>Try widening the area, or be the first to add one here.</p>
      <div className="gs-empty-btns">
        <button className="gs-btn gs-btn-ghost" onClick={onClear}>Clear filter</button>
        <button className="gs-btn gs-btn-primary" onClick={onAdd}>Add a {m.label.toLowerCase()} spot</button>
      </div>
    </div>
  );
}

// ── Login / register modal ───────────────────────────────────────────────────
function SocialRow({ label, bg, fg, dot, onClick }) {
  return (
    <button className="gs-social" style={{ background: bg, color: fg, borderColor: bg === '#fff' ? C.color.line : 'transparent' }} onClick={onClick}>
      <span className="gs-social-dot" style={{ background: dot }} />{label}
    </button>
  );
}
function LoginModal() {
  const { loginOpen, setLoginOpen, login } = useApp();
  const [mode, setMode] = React.useState('login');   // login | register
  const [u, setU] = React.useState(''); const [p, setP] = React.useState(''); const [err, setErr] = React.useState('');
  if (!loginOpen) return null;
  const submit = () => {
    if (mode === 'register') { if (!u || !p) { setErr('Fill in both fields.'); return; } login({ name: u, role: 'user' }); return; }
    if (u === 'admin' && p === 'admin') { login({ name: 'admin', role: 'admin' }); return; }
    setErr('For the demo, log in with admin / admin — or use a social button.');
  };
  return (
    <div className="gs-modal-scrim" onClick={() => setLoginOpen(false)}>
      <div className="gs-modal" onClick={(e) => e.stopPropagation()}>
        <button className="gs-modal-x" onClick={() => setLoginOpen(false)}><UIcon name="close" size={18} stroke={C.color.ink} /></button>
        <Logo size={30} />
        <h2>{mode === 'login' ? 'Log in to GemSpot' : 'Create your account'}</h2>
        <p className="gs-modal-sub">Save spots and add your own. Browsing the map stays free and open.</p>
        <div className="gs-social-col">
          <SocialRow label="Continue with Google" bg="#fff" fg={C.color.ink} dot="#ea4335" onClick={() => login({ name: 'You', role: 'user' })} />
          <SocialRow label="Continue with Facebook" bg="#1877f2" fg="#fff" dot="#fff" onClick={() => login({ name: 'You', role: 'user' })} />
          <SocialRow label="Continue with Instagram" bg="#000" fg="#fff" dot="#e1306c" onClick={() => login({ name: 'You', role: 'user' })} />
        </div>
        <div className="gs-or"><span /><b>OR EMAIL</b><span /></div>
        <div className="gs-field"><label>Username</label><input value={u} onChange={(e) => { setU(e.target.value); setErr(''); }} placeholder="admin" /></div>
        <div className="gs-field"><label>Password</label><input type="password" value={p} onChange={(e) => { setP(e.target.value); setErr(''); }} placeholder="admin" /></div>
        {err && <div className="gs-err">{err}</div>}
        <button className="gs-btn gs-btn-primary gs-btn-block" onClick={submit}>{mode === 'login' ? 'Log in' : 'Create account'}</button>
        <div className="gs-modal-switch">
          {mode === 'login'
            ? <>New here? <a onClick={() => { setMode('register'); setErr(''); }}>Create an account</a></>
            : <>Have an account? <a onClick={() => { setMode('login'); setErr(''); }}>Log in</a></>}
        </div>
      </div>
    </div>
  );
}

// ── Saved (filtered explore view) ────────────────────────────────────────────
function Saved() {
  const { spots, savedIds, setSelected, selected, auth, setLoginOpen } = useApp();
  const isMobile = useMedia('(max-width: 899px)');
  const saved = spots.filter((s) => savedIds.includes(s.id)).sort((a, b) => a.dist - b.dist);

  if (!auth) {
    return <div className="gs-gate">
      <span className="gs-gate-ic"><UIcon name="bookmark" size={28} stroke={C.color.inkFaint} /></span>
      <h3>Log in to see your saved spots</h3>
      <p>Your gems sync across devices once you're signed in.</p>
      <button className="gs-btn gs-btn-primary" onClick={() => setLoginOpen(true)}>Log in</button>
    </div>;
  }

  const head = (
    <div className="gs-rail-head"><div><strong>Saved spots</strong><span>{saved.length} gems · sorted by distance</span></div></div>
  );
  const list = saved.length === 0
    ? <div className="gs-empty"><span className="gs-empty-ic" style={{ background: C.color.surface2 }}><UIcon name="bookmark" size={26} stroke={C.color.inkFaint} /></span><h3>Nothing saved yet</h3><p>Tap the bookmark on any place to keep it here.</p></div>
    : <div className="gs-rail-list">{saved.map((sp) => <SpotCard key={sp.id} sp={sp} />)}</div>;

  if (isMobile) {
    return <div className="gs-saved-m">{head}{list}{selected && <SpotDetail id={selected} onClose={() => setSelected(null)} fullscreen />}</div>;
  }
  return (
    <div className="gs-explore">
      <aside className="gs-rail">{head}{list}{selected && <SpotDetail id={selected} onClose={() => setSelected(null)} />}</aside>
      <div className="gs-mapwrap"><WebMap spots={saved} selectedId={selected} onSelectSpot={setSelected} showMe={false} /></div>
    </div>
  );
}

// ── Add a spot (map-click pin + stepper + pending) ───────────────────────────
const ADD_STEPS = ['Location', 'Category', 'Details', 'Review'];
function AddSpot() {
  const { auth, setLoginOpen, go, flashToast } = useApp();
  const [step, setStep] = React.useState(0);
  const [pin, setPin] = React.useState(null);
  const [cat, setCat] = React.useState(null);
  const [name, setName] = React.useState('');
  const [note, setNote] = React.useState('');
  const [done, setDone] = React.useState(false);

  if (!auth) {
    return <div className="gs-gate">
      <span className="gs-gate-ic"><UIcon name="plus" size={26} stroke={C.color.inkFaint} /></span>
      <h3>Log in to add a spot</h3>
      <p>Every submission is checked by a local reviewer before it goes live.</p>
      <button className="gs-btn gs-btn-primary" onClick={() => setLoginOpen(true)}>Log in</button>
    </div>;
  }

  if (done) {
    return (
      <div className="gs-add-success">
        <span className="gs-add-check"><UIcon name="check" size={38} stroke="#fff" strokeWidth={2.4} /></span>
        <h2>Sent for review</h2>
        <p>Thanks! A GemSpot reviewer checks every new spot before it goes live. We'll notify you when <b>{name || 'your spot'}</b> is approved — usually within a day.</p>
        <span className="gs-pending"><i /> Pending review</span>
        <div className="gs-add-success-btns">
          <button className="gs-btn gs-btn-ghost" onClick={() => { setDone(false); setStep(0); setPin(null); setCat(null); setName(''); setNote(''); }}>Add another</button>
          <button className="gs-btn gs-btn-primary" onClick={() => go('explore')}>Back to map</button>
        </div>
      </div>
    );
  }

  const canNext = (step === 0 && pin) || (step === 1 && cat) || (step === 2 && name.trim()) || step === 3;
  const next = () => { if (step < 3) setStep(step + 1); else { setDone(true); flashToast('Submission sent'); } };

  return (
    <div className="gs-add">
      <div className="gs-add-map">
        <WebMap spots={[]} pinMode pinPos={pin} onPlacePin={setPin} controls={false} showMe={false} showLabels />
      </div>
      <aside className="gs-add-panel">
        <div className="gs-add-head">
          <button className="gs-add-close" onClick={() => go('explore')}><UIcon name="close" size={18} stroke={C.color.ink} /></button>
          <span>Add a spot</span>
        </div>
        <div className="gs-stepper">
          {ADD_STEPS.map((s, i) => <div key={s} className="gs-step" data-on={i === step} data-done={i < step}><i>{i < step ? '✓' : i + 1}</i>{s}</div>)}
        </div>
        <div className="gs-add-content">
          {step === 0 && <>
            <h3>Where is it?</h3>
            <p>Click the map to drop a pin on the exact spot. Drag to fine-tune.</p>
            <button className="gs-locrow"><UIcon name="location" size={18} stroke={C.color.accent} /> Use my current location</button>
            {pin && <div className="gs-pin-ok"><UIcon name="check" size={15} stroke="#2f9e5b" strokeWidth={2.2} /> Pin placed — Toompea area</div>}
          </>}
          {step === 1 && <>
            <h3>What kind of spot?</h3>
            <div className="gs-add-cats">
              {GEM_CATEGORIES.map((c) => (
                <button key={c.id} className="gs-add-cat" data-on={cat === c.id} style={{ '--cc': catColor(c.id) }} onClick={() => setCat(c.id)}>
                  <span style={{ background: cat === c.id ? 'rgba(255,255,255,0.25)' : catColor(c.id) }}><GemGlyph cat={c.id} size={15} color="#fff" /></span>{c.label}
                </button>
              ))}
            </div>
          </>}
          {step === 2 && <>
            <h3>Tell us about it</h3>
            <div className="gs-field"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Linnahall rooftop" /></div>
            <div className="gs-field"><label>Short note</label><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="What makes it worth the trip?" /></div>
            <div className="gs-field"><label>Photos <span className="gs-opt">1–3 recommended</span></label>
              <div className="gs-upload"><UIcon name="camera" size={20} stroke={C.color.inkFaint} /> Drag photos or browse</div>
            </div>
          </>}
          {step === 3 && <>
            <h3>Review & submit</h3>
            <div className="gs-review">
              <div className="gs-review-row"><span>Category</span><b>{cat ? catMeta(cat).label : '—'}</b></div>
              <div className="gs-review-row"><span>Name</span><b>{name || '—'}</b></div>
              <div className="gs-review-row"><span>Location</span><b>Toompea (pinned)</b></div>
              <div className="gs-review-row"><span>Note</span><b className="gs-review-note">{note || '—'}</b></div>
            </div>
            <div className="gs-review-mod"><UIcon name="check" size={15} stroke={C.color.accent} strokeWidth={2} /> A local reviewer will check this before it appears on the map.</div>
          </>}
        </div>
        <div className="gs-add-foot">
          {step > 0 && <button className="gs-btn gs-btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
          <button className="gs-btn gs-btn-primary gs-grow" data-dim={!canNext} onClick={() => canNext && next()}>{step === 3 ? 'Submit for review' : 'Next'}</button>
        </div>
      </aside>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toaster() {
  const { toast } = useApp();
  return <div className="gs-toaster">{toast && <div className="gs-toast" key={toast.id}><UIcon name="check" size={15} stroke="#fff" strokeWidth={2.2} />{toast.msg}</div>}</div>;
}

Object.assign(window, { LocationPrompt, EmptyFilter, LoginModal, Saved, AddSpot, Toaster });
