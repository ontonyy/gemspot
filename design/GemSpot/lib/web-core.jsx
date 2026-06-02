/* GemSpot Web — core: Direction C tokens, data layer, shared UI helpers,
   app store (context), and the responsive web map with clustering.
   Reuses GEM_SPOTS / GEM_CATEGORIES / GemGlyph / GemMarker / TallinnMap / UIcon
   from the existing Direction-C lib so the visual language stays identical. */

const C = DIR_C;                       // the saved direction
const CAT = C.cat;                     // category → color
function catColor(id) { return CAT[id] || C.color.accent; }
function catMeta(id) { return GEM_CAT[id]; }

// CSS custom properties for the whole web app (token source of truth).
const CSS_VARS = `
  --bg:${C.color.bg}; --surface:${C.color.surface}; --surface2:${C.color.surface2};
  --ink:${C.color.ink}; --ink-soft:${C.color.inkSoft}; --ink-faint:${C.color.inkFaint};
  --line:${C.color.line}; --accent:${C.color.accent}; --accent2:${C.color.accent2};
  --r-card:${C.radius.card}px; --r-chip:${C.radius.chip}px; --r-btn:${C.radius.btn}px;
  --font-head:${C.font.head}; --font-body:${C.font.body};
  --ease:cubic-bezier(0.23,1,0.32,1);
`;

// ── Data layer ────────────────────────────────────────────────────────────
// Augment the shared spots with web-only fields (distance, contributor,
// moderation status, freshness). Ratings are intentionally dropped (post-MVP).
const DIST = { s1: 0.4, s2: 1.8, s3: 1.1, s4: 2.6, s5: 3.1, s6: 0.7, s7: 0.9, s8: 0.5, s9: 2.9, s10: 0.8 };
const META = {
  s1: { by: 'Marta', when: '2w', verified: true,  free: true,  feature: 'Open access' },
  s2: { by: 'Jaan',  when: '1mo', verified: true,  free: true,  feature: 'Lights till 23:00' },
  s3: { by: 'Liis',  when: '3w', verified: true,  free: false, feature: 'Bookable' },
  s4: { by: 'Toomas',when: '2mo', verified: true,  free: false, feature: 'Seasonal' },
  s5: { by: 'Anu',   when: '5d', verified: true,  free: false, feature: 'Indoor' },
  s6: { by: 'Marta', when: '2w', verified: true,  free: true,  feature: 'Sunset spot' },
  s7: { by: 'Kristjan',when:'1w', verified: true,  free: true,  feature: 'Busy midday' },
  s8: { by: 'Eva',   when: '4d', verified: true,  free: true,  feature: 'Late April' },
  s9: { by: 'Eva',   when: '1mo', verified: true,  free: true,  feature: 'Park' },
  s10:{ by: 'Rasmus',when: '6d', verified: false, free: true,  feature: 'Half court' },
};
const WEB_SPOTS = GEM_SPOTS.map((s) => ({
  ...s, dist: DIST[s.id], ...META[s.id], status: 'approved',
}));
function distLabel(id) { return DIST[id] != null ? `${DIST[id].toFixed(1)} km` : ''; }

// Moderation queue (pending user submissions) for the admin view.
const QUEUE = [
  { id: 'q1', cat: 'scenic', name: 'Linnahall rooftop', hood: 'Kesklinn', by: 'henri', when: '12 min ago', note: 'Brutalist steps facing the bay — quiet at sunset.', photos: 3, dupe: false },
  { id: 'q2', cat: 'basketball', name: 'Stroomi beach court', hood: 'Pelguranna', by: 'mari_k', when: '1 h ago', note: 'Sand-side half court near the promenade.', photos: 2, dupe: false },
  { id: 'q3', cat: 'tabletennis', name: 'Telliskivi tables', hood: 'Kalamaja', by: 'guest_5521', when: '3 h ago', note: 'Two tables in the creative city courtyard.', photos: 1, dupe: true },
  { id: 'q4', cat: 'sakura', name: 'Löwenruh blossoms', hood: 'Kristiine', by: 'eva', when: '5 h ago', note: 'Small cherry cluster by the pond.', photos: 4, dupe: false },
];

// ── App store (React context) ───────────────────────────────────────────────
const AppCtx = React.createContext(null);
const useApp = () => React.useContext(AppCtx);

function loadLS(k, d) { try { const v = JSON.parse(localStorage.getItem('gemspot_' + k)); return v == null ? d : v; } catch { return d; } }
function saveLS(k, v) { try { localStorage.setItem('gemspot_' + k, JSON.stringify(v)); } catch {} }

function AppProvider({ children }) {
  const [route, setRoute] = React.useState(() => (location.hash.replace('#/', '') || 'landing'));
  const [selected, setSelected] = React.useState(null);   // spot id (detail panel)
  const [category, setCategory] = React.useState(null);   // filter
  const [auth, setAuth] = React.useState(() => loadLS('auth', null)); // {name, role}
  const [savedIds, setSavedIds] = React.useState(() => loadLS('saved', ['s6', 's3']));
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState(null); // run after login
  const [toast, setToast] = React.useState(null);
  const [locPerm, setLocPerm] = React.useState(() => loadLS('locperm', null)); // null|granted|denied

  React.useEffect(() => { saveLS('saved', savedIds); }, [savedIds]);
  React.useEffect(() => { saveLS('auth', auth); }, [auth]);
  React.useEffect(() => { saveLS('locperm', locPerm); }, [locPerm]);

  // keep hash in sync (deep links + back button)
  const go = React.useCallback((r) => { setRoute(r); location.hash = '/' + r; window.scrollTo(0, 0); }, []);
  React.useEffect(() => {
    const onHash = () => setRoute(location.hash.replace('#/', '') || 'landing');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const flashToast = React.useCallback((msg, kind = 'ok') => {
    setToast({ msg, kind, id: Date.now() });
    setTimeout(() => setToast((t) => (t && Date.now() - t.id >= 2400 ? null : t)), 2600);
  }, []);

  // gate an action behind auth: if logged out, open login and queue it
  const requireAuth = React.useCallback((fn) => {
    if (auth) { fn(); return; }
    setPendingAction(() => fn); setLoginOpen(true);
  }, [auth]);

  const login = React.useCallback((user) => {
    setAuth(user); setLoginOpen(false);
    flashToast(`Welcome, ${user.name}`);
    if (pendingAction) { const f = pendingAction; setPendingAction(null); setTimeout(f, 60); }
  }, [pendingAction, flashToast]);

  const logout = React.useCallback(() => { setAuth(null); flashToast('Signed out'); go('explore'); }, [flashToast, go]);

  const toggleSave = React.useCallback((id) => {
    requireAuth(() => {
      setSavedIds((prev) => {
        const has = prev.includes(id);
        flashToast(has ? 'Removed from saved' : 'Saved');
        return has ? prev.filter((x) => x !== id) : [...prev, id];
      });
    });
  }, [requireAuth, flashToast]);

  const value = {
    route, go, selected, setSelected, category, setCategory,
    auth, login, logout, requireAuth, savedIds, toggleSave,
    loginOpen, setLoginOpen, toast, flashToast, locPerm, setLocPerm,
    spots: WEB_SPOTS,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

// ── Small shared UI ──────────────────────────────────────────────────────────
function Logo({ size = 30, withText = true, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ width: size, height: size, borderRadius: size * 0.32, background: C.color.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
        <GemGlyph cat="scenic" size={size * 0.6} color="#fff" />
      </div>
      {withText && <span style={{ fontFamily: C.font.head, fontWeight: 700, fontSize: size * 0.6, letterSpacing: '-0.02em', color: C.color.ink }}>GemSpot</span>}
    </div>
  );
}

function Tag({ children }) {
  return <span className="gs-tag">{children}</span>;
}

function SaveButton({ id, size = 36, light = false }) {
  const { savedIds, toggleSave } = useApp();
  const saved = savedIds.includes(id);
  return (
    <button className="gs-savebtn" data-saved={saved} data-light={light}
      style={{ width: size, height: size }}
      onClick={(e) => { e.stopPropagation(); toggleSave(id); }}
      aria-label={saved ? 'Remove from saved' : 'Save'} title={saved ? 'Saved' : 'Save'}>
      <UIcon name="bookmark" size={size * 0.46} stroke={saved ? '#fff' : C.color.ink} fill={saved ? '#fff' : 'none'} />
    </button>
  );
}

function CatBadge({ cat, lg = false }) {
  const m = catMeta(cat); const col = catColor(cat);
  return (
    <span className="gs-catbadge" style={{ background: `${col}1a`, color: col, padding: lg ? '5px 11px 5px 8px' : '3px 9px 3px 6px', fontSize: lg ? 12.5 : 11 }}>
      <span style={{ width: lg ? 18 : 15, height: lg ? 18 : 15, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
        <GemGlyph cat={cat} size={lg ? 11 : 9} color="#fff" />
      </span>
      {m.label}
    </span>
  );
}

// Directions handoff sheet (Apple / Google Maps) — answers the audit gap.
function directionsURL(provider, sp) {
  const q = encodeURIComponent(`${sp.name}, Tallinn`);
  return provider === 'apple' ? `https://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
}

Object.assign(window, {
  C, CAT, catColor, catMeta, CSS_VARS, WEB_SPOTS, distLabel, QUEUE,
  AppCtx, useApp, AppProvider, Logo, Tag, SaveButton, CatBadge, directionsURL,
});
