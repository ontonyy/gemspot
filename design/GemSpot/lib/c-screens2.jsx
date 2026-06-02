/* GemSpot — Direction C MVP screens, part 2:
   Add (linear + pending-review), Saved (flat + inline remove + empty),
   Login/auth, and the missing states (location permission, empty filter). */

// ── 5a. Add — Step 1: Location ───────────────────────────────────────────────
// Fix: the location step is its OWN step. The "drag to position" instruction
// only appears here, where it's true.
function CAddLocation({ D }) {
  return (
    <PhoneScreen bg={D.color.bg}>
      <MapStage D={D} showMe={false} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,20,28,0.22)', zIndex: 1 }} />
      <div style={{ position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%,-100%)', zIndex: 2 }}>
        <GemMarker cat="scenic" color={D.color.accent} variant={D.marker} size={40} state="selected" label="Drag map to position" />
      </div>
      <div style={{ position: 'relative', zIndex: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <StatusBar dark />
        <div style={{ padding: '8px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 38, height: 38, borderRadius: D.radius.btn, background: D.color.surface, border: `1px solid ${D.color.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UIcon name="close" size={18} stroke={D.color.ink} /></div>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: D.color.ink, background: D.color.surface, padding: '6px 12px', borderRadius: 100, boxShadow: '0 2px 8px rgba(20,26,40,0.12)' }}>Step 1 of 4 · Location</span>
          <div style={{ width: 38 }} />
        </div>
        <div style={{ flex: 1 }} />
        <Sheet D={D} pad={16}>
          <div style={{ padding: '4px 18px 0' }}>
            <StepDots D={D} total={4} current={0} />
            <div style={{ fontFamily: D.font.head, fontSize: 18, fontWeight: 700, color: D.color.ink, marginTop: 14 }}>Where is it?</div>
            <div style={{ fontSize: 13, color: D.color.inkSoft, marginTop: 5, lineHeight: 1.4 }}>Drag the map so the pin sits on the spot, or use your current location.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '11px 13px', borderRadius: D.radius.btn, border: `1px solid ${D.color.line}`, background: D.color.surface2 }}>
              <UIcon name="location" size={18} stroke={D.color.accent} />
              <span style={{ fontSize: 13, fontWeight: 700, color: D.color.ink }}>Use my current location</span>
            </div>
            <div style={{ marginTop: 14 }}><ActBtn D={D} label="Confirm location" kind="filled" flex icon="chevron" /></div>
          </div>
        </Sheet>
        <HomeIndicator dark />
      </div>
    </PhoneScreen>
  );
}

// ── 5b. Add — Step 2: Category (pin already locked, no contradiction) ─────────
function CAddCategory({ D }) {
  return (
    <PhoneScreen bg={D.color.bg}>
      <StatusBar dark />
      <div style={{ padding: '8px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 38, height: 38, borderRadius: D.radius.btn, background: D.color.surface, border: `1px solid ${D.color.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UIcon name="back" size={19} stroke={D.color.ink} /></div>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: D.color.inkFaint }}>Step 2 of 4 · Category</span>
        <div style={{ width: 38 }} />
      </div>
      {/* locked location summary */}
      <div style={{ padding: '14px 18px 0' }}>
        <StepDots D={D} total={4} current={1} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '10px 12px', borderRadius: D.radius.card, border: `1px solid ${D.color.line}`, background: D.color.surface }}>
          <div style={{ width: 38, height: 38, borderRadius: D.radius.btn, overflow: 'hidden', position: 'relative', flex: '0 0 auto' }}>
            <TallinnMap theme={D.map} showLabels={false} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: D.color.ink }}>Toompea</div>
            <div style={{ fontSize: 11, color: D.color.inkFaint, fontWeight: 600 }}>Pinned location</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: D.color.accent }}>Edit</span>
        </div>
      </div>
      <div style={{ padding: '20px 18px 0', fontFamily: D.font.head, fontSize: 18, fontWeight: 700, color: D.color.ink }}>What kind of spot?</div>
      <div style={{ flex: 1, padding: '14px 18px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, alignContent: 'start' }}>
        {GEM_CATEGORIES.map((c, i) => {
          const on = i === 5; const col = gemCatColor(D, c.id);
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: D.radius.card,
              background: on ? col : D.color.surface, border: `1.5px solid ${on ? col : D.color.line}`, boxShadow: on ? `0 5px 14px ${col}44` : 'none' }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: on ? 'rgba(255,255,255,0.25)' : col, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <GemGlyph cat={c.id} size={17} color="#fff" />
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: on ? '#fff' : D.color.ink }}>{c.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '12px 18px', display: 'flex', gap: 10 }}>
        <ActBtn D={D} label="Back" />
        <ActBtn D={D} label="Next" kind="filled" flex icon="chevron" />
      </div>
      <HomeIndicator dark />
    </PhoneScreen>
  );
}

// ── 5c. Add — Submitted → pending review ─────────────────────────────────────
// Fix: explicit confirmation; tells the user it goes to a reviewer, not live yet.
function CAddSuccess({ D }) {
  return (
    <PhoneScreen bg={D.color.bg}>
      <StatusBar dark />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 34px', textAlign: 'center' }}>
        <div style={{ width: 76, height: 76, borderRadius: '50%', background: D.color.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 10px 28px ${D.color.accent}44` }}>
          <UIcon name="check" size={38} stroke="#fff" strokeWidth={2.4} />
        </div>
        <div style={{ fontFamily: D.font.head, fontSize: 23, fontWeight: 700, color: D.color.ink, marginTop: 22, letterSpacing: '-0.015em' }}>Sent for review</div>
        <div style={{ fontSize: 14, color: D.color.inkSoft, lineHeight: 1.5, marginTop: 10 }}>
          Thanks! A GemSpot reviewer checks every new spot before it goes live. We'll notify you when <b style={{ color: D.color.ink }}>Tennis at Kadriorg</b> is approved — usually within a day.
        </div>
        {/* status pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 18, padding: '7px 14px', borderRadius: 100, background: D.color.surface, border: `1px solid ${D.color.line}` }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: '#e0a32e' }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: D.color.ink }}>Pending review</span>
        </div>
      </div>
      <div style={{ padding: '0 18px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ActBtn D={D} label="Add another spot" />
        <ActBtn D={D} label="Back to map" kind="filled" flex />
      </div>
      <HomeIndicator dark />
    </PhoneScreen>
  );
}

// ── 6. Saved — flat list, inline remove, no tabs/collections ─────────────────
function CSaved({ D }) {
  const saved = [GEM_SPOTS[5], GEM_SPOTS[2], GEM_SPOTS[8], GEM_SPOTS[1]];
  return (
    <PhoneScreen bg={D.color.bg}>
      <StatusBar dark />
      <div style={{ padding: '10px 18px 4px' }}>
        <div style={{ fontFamily: D.font.head, fontSize: 27, fontWeight: 700, color: D.color.ink, letterSpacing: '-0.015em' }}>Saved spots</div>
        <div style={{ fontSize: 13, color: D.color.inkSoft, marginTop: 3, fontWeight: 500 }}>{saved.length} gems · sorted by distance</div>
      </div>
      <div style={{ flex: 1, padding: '10px 18px 0', overflow: 'hidden' }}>
        {saved.map((sp) => <CResultRow key={sp.id} D={D} sp={sp} saved showSave />)}
      </div>
      <CBottomNav D={D} active="saved" />
    </PhoneScreen>
  );
}

// ── 6b. Saved — empty ────────────────────────────────────────────────────────
function CSavedEmpty({ D }) {
  return (
    <PhoneScreen bg={D.color.bg}>
      <StatusBar dark />
      <div style={{ padding: '10px 18px 4px' }}>
        <div style={{ fontFamily: D.font.head, fontSize: 27, fontWeight: 700, color: D.color.ink, letterSpacing: '-0.015em' }}>Saved spots</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 40px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: D.color.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${D.color.line}` }}>
          <UIcon name="bookmark" size={28} stroke={D.color.inkFaint} />
        </div>
        <div style={{ fontFamily: D.font.head, fontSize: 18, fontWeight: 700, color: D.color.ink, marginTop: 18 }}>Nothing saved yet</div>
        <div style={{ fontSize: 13.5, color: D.color.inkSoft, lineHeight: 1.5, marginTop: 8 }}>Tap the bookmark on any place to keep it here for later.</div>
        <div style={{ marginTop: 18 }}><ActBtn D={D} label="Explore the map" kind="filled" icon="compass" /></div>
      </div>
      <CBottomNav D={D} active="saved" />
    </PhoneScreen>
  );
}

// ── 7. Login / auth ──────────────────────────────────────────────────────────
// Social (Google / Facebook / Instagram) + email register & login.
function SocialBtn({ D, label, bg, fg, dot }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: 48, borderRadius: D.radius.btn,
      background: bg, color: fg, border: bg === '#fff' ? `1px solid ${D.color.line}` : 'none', fontWeight: 700, fontSize: 14, fontFamily: D.font.body }}>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: dot, display: 'inline-block', flex: '0 0 auto' }} />
      {label}
    </div>
  );
}
function CLogin({ D }) {
  const Field = ({ ph, hint }) => (
    <div style={{ height: 48, borderRadius: D.radius.btn, border: `1px solid ${D.color.line}`, background: D.color.surface,
      display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 14, color: D.color.inkFaint, fontWeight: 500 }}>
      {ph}{hint && <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'ui-monospace, monospace', color: D.color.inkFaint, opacity: 0.7 }}>{hint}</span>}
    </div>
  );
  return (
    <PhoneScreen bg={D.color.surface}>
      <StatusBar dark />
      <div style={{ flex: 1, padding: '20px 26px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: D.color.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GemGlyph cat="scenic" size={23} color="#fff" />
          </div>
          <span style={{ fontFamily: D.font.head, fontWeight: 700, fontSize: 19, letterSpacing: '-0.01em', color: D.color.ink }}>GemSpot</span>
        </div>
        <div style={{ fontFamily: D.font.head, fontSize: 26, fontWeight: 700, color: D.color.ink, letterSpacing: '-0.015em', lineHeight: 1.1, marginTop: 28 }}>Hidden gems,<br />spotted by locals</div>
        <div style={{ fontSize: 13.5, color: D.color.inkSoft, marginTop: 8, lineHeight: 1.45 }}>Log in to save spots and add your own.</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 26 }}>
          <SocialBtn D={D} label="Continue with Google" bg="#fff" fg={D.color.ink} dot="#ea4335" />
          <SocialBtn D={D} label="Continue with Facebook" bg="#1877f2" fg="#fff" dot="#fff" />
          <SocialBtn D={D} label="Continue with Instagram" bg="#000" fg="#fff" dot="#e1306c" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: D.color.line }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: D.color.inkFaint, letterSpacing: '0.04em' }}>OR EMAIL</span>
          <div style={{ flex: 1, height: 1, background: D.color.line }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field ph="Username" hint="admin" />
          <Field ph="Password" hint="admin" />
          <ActBtn D={D} label="Log in" kind="filled" flex />
        </div>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: D.color.inkSoft, fontWeight: 600 }}>
          New here? <span style={{ color: D.color.accent, fontWeight: 700 }}>Create an account</span>
        </div>
      </div>
      <HomeIndicator dark />
    </PhoneScreen>
  );
}

// ── 8. State: location permission prompt ─────────────────────────────────────
function CPermission({ D }) {
  return (
    <PhoneScreen bg={D.color.bg}>
      <MapStage D={D} showMe={false} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,20,28,0.4)', zIndex: 1, backdropFilter: 'blur(1px)' }} />
      <div style={{ position: 'relative', zIndex: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <StatusBar dark={false} />
        <div style={{ flex: 1 }} />
        <div style={{ margin: '0 16px 16px', background: D.color.surface, borderRadius: D.radius.sheet, padding: '24px 22px', boxShadow: '0 -8px 32px rgba(20,26,40,0.2)' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${D.color.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UIcon name="location" size={26} stroke={D.color.accent} />
          </div>
          <div style={{ fontFamily: D.font.head, fontSize: 19, fontWeight: 700, color: D.color.ink, marginTop: 16, letterSpacing: '-0.01em' }}>Show spots near you?</div>
          <div style={{ fontSize: 13.5, color: D.color.inkSoft, lineHeight: 1.5, marginTop: 8 }}>GemSpot uses your location to show nearby gems and sort by distance. You can still browse the whole map without it.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
            <ActBtn D={D} label="Allow location" kind="filled" flex />
            <ActBtn D={D} label="Not now" />
          </div>
        </div>
        <HomeIndicator dark />
      </div>
    </PhoneScreen>
  );
}

// ── 9. State: empty filter result ────────────────────────────────────────────
function CEmptyFilter({ D }) {
  const cat = 'padel';
  return (
    <MapFrame D={D} mapProps={{ filter: 'none', selectedId: null }}
      header={
        <div style={{ padding: '6px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 46, height: 46, borderRadius: D.radius.btn, background: D.color.surface, border: `1px solid ${D.color.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(20,26,40,0.12)', flex: '0 0 auto' }}>
              <UIcon name="back" size={20} stroke={D.color.ink} />
            </div>
            <div style={{ flex: 1 }}><SearchPill D={D} placeholder="Search padel spots" leading="search" /></div>
          </div>
          <CChips D={D} active={cat} />
        </div>
      }
      sheet={
        <Sheet D={D} pad={20}>
          <div style={{ padding: '8px 24px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: D.color.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GemGlyph cat={cat} size={26} color={gemCatColor(D, cat)} />
            </div>
            <div style={{ fontFamily: D.font.head, fontSize: 17, fontWeight: 700, color: D.color.ink, marginTop: 14 }}>No padel spots within 5 km</div>
            <div style={{ fontSize: 13, color: D.color.inkSoft, lineHeight: 1.45, marginTop: 7 }}>Try widening the area, or be the first to add one here.</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <ActBtn D={D} label="Widen area" />
              <ActBtn D={D} label="Add a padel spot" kind="filled" icon="plus" />
            </div>
          </div>
        </Sheet>
      }
      nav="explore"
      navBar={<CBottomNav D={D} active="explore" />}
    />
  );
}

Object.assign(window, { CAddLocation, CAddCategory, CAddSuccess, CSaved, CSavedEmpty, SocialBtn, CLogin, CPermission, CEmptyFilter });
