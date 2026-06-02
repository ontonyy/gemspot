/* GemSpot Web — app shell: top bar (desktop) + bottom nav (mobile),
   routing, and mount. */

function UserMenu() {
  const { auth, logout, go } = useApp();
  const [open, setOpen] = React.useState(false);
  if (!auth) return null;
  return (
    <div className="gs-usermenu" onMouseLeave={() => setOpen(false)}>
      <button className="gs-avatar-btn" onClick={() => setOpen(!open)}><Avatar size={32} label={auth.name[0].toUpperCase()} bg={C.color.accent} /></button>
      {open && (
        <div className="gs-usermenu-pop">
          <div className="gs-usermenu-head"><b>{auth.name}</b><span>{auth.role === 'admin' ? 'Administrator' : 'Member'}</span></div>
          <a onClick={() => { go('saved'); setOpen(false); }}><UIcon name="bookmark" size={16} stroke={C.color.ink} /> Saved spots</a>
          <a onClick={() => { go('add'); setOpen(false); }}><UIcon name="plus" size={16} stroke={C.color.ink} /> Add a spot</a>
          {auth.role === 'admin' && <a onClick={() => { go('admin'); setOpen(false); }}><UIcon name="layers" size={16} stroke={C.color.ink} /> Moderation</a>}
          <a className="gs-usermenu-out" onClick={() => { logout(); setOpen(false); }}>Log out</a>
        </div>
      )}
    </div>
  );
}

function TopBar() {
  const { route, go, auth, setLoginOpen, savedIds } = useApp();
  const nav = [['explore', 'Explore'], ['saved', 'Saved']];
  return (
    <header className="gs-topbar">
      <Logo size={30} onClick={() => go('landing')} />
      <nav className="gs-topnav">
        {nav.map(([r, l]) => <button key={r} data-on={route === r} onClick={() => go(r)}>{l}{r === 'saved' && savedIds.length > 0 && <i className="gs-navcount">{savedIds.length}</i>}</button>)}
      </nav>
      <div className="gs-topsearch">
        <UIcon name="search" size={17} stroke={C.color.inkFaint} />
        <input placeholder="Search spots in Tallinn" />
      </div>
      <div className="gs-topright">
        <button className="gs-btn gs-btn-primary gs-btn-add" onClick={() => go('add')}><UIcon name="plus" size={16} stroke="#fff" strokeWidth={2} /> Add a spot</button>
        {auth ? <UserMenu /> : <button className="gs-btn gs-btn-ghost" onClick={() => setLoginOpen(true)}>Log in</button>}
      </div>
    </header>
  );
}

function MobileNav() {
  const { route, go, auth, setLoginOpen, savedIds } = useApp();
  const items = [
    { id: 'explore', label: 'Explore', icon: 'compass' },
    { id: 'saved', label: 'Saved', icon: 'bookmark' },
    { id: 'add', label: 'Add', icon: 'plus', fab: true },
    { id: 'you', label: auth ? 'You' : 'Log in', icon: null },
  ];
  return (
    <nav className="gs-mobnav">
      {items.map((it) => {
        if (it.fab) return (
          <button key={it.id} className="gs-mobnav-fab" onClick={() => go('add')} aria-label="Add a spot"><UIcon name="plus" size={22} stroke="#fff" strokeWidth={2} /></button>
        );
        const on = route === it.id;
        const onClick = it.id === 'you' ? () => (auth ? go('saved') : setLoginOpen(true)) : () => go(it.id);
        return (
          <button key={it.id} className="gs-mobnav-item" data-on={on} onClick={onClick}>
            {it.icon
              ? <span className="gs-mobnav-ic"><UIcon name={it.icon} size={22} stroke={on ? C.color.accent : C.color.inkFaint} fill={on && it.id === 'saved' ? C.color.accent : 'none'} />{it.id === 'saved' && savedIds.length > 0 && <i className="gs-mobnav-dot" />}</span>
              : <Avatar size={22} label={auth ? auth.name[0].toUpperCase() : '?'} bg={on ? C.color.accent : C.color.inkFaint} />}
            <span>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Shell() {
  const { route } = useApp();
  const isMobile = useMedia('(max-width: 899px)');
  const isAdmin = route === 'admin';
  const isLanding = route === 'landing';
  const showMobNav = isMobile && !isAdmin && !isLanding;

  let body;
  if (route === 'landing') body = <Landing />;
  else if (route === 'saved') body = <Saved />;
  else if (route === 'add') body = <AddSpot />;
  else if (route === 'admin') body = <Admin />;
  else body = <Explore />;

  return (
    <div className="gs-shell" data-route={route} data-mobnav={showMobNav}>
      {!isAdmin && <TopBar />}
      <div className="gs-body">{body}</div>
      {showMobNav && <MobileNav />}
      <LoginModal />
      <Toaster />
    </div>
  );
}

function GemSpotWeb() {
  return <AppProvider><Shell /></AppProvider>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<GemSpotWeb />);
Object.assign(window, { TopBar, MobileNav, Shell, GemSpotWeb });
