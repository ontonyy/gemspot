/* GemSpot Web — admin (desktop, utilitarian). Dashboard stats + moderation
   queue + review drawer. Brand-connected but data-first, per the brief.
   Gated to role === 'admin' (log in with admin / admin). */

function Admin() {
  const { auth, go, flashToast } = useApp();
  const [queue, setQueue] = React.useState(QUEUE);
  const [active, setActive] = React.useState(null);  // submission under review

  if (!auth || auth.role !== 'admin') {
    return <div className="gs-gate">
      <span className="gs-gate-ic"><UIcon name="layers" size={26} stroke={C.color.inkFaint} /></span>
      <h3>Admin access only</h3>
      <p>Log in with <b>admin / admin</b> to open the moderation panel.</p>
      <button className="gs-btn gs-btn-primary" onClick={() => go('explore')}>Back to map</button>
    </div>;
  }

  const stats = [
    { l: 'Pending review', n: queue.length, accent: true },
    { l: 'New users (7d)', n: 42 },
    { l: 'New spots (7d)', n: 18 },
    { l: 'Reports open', n: 3 },
  ];
  const topCats = [
    { id: 'scenic', opens: 1240 }, { id: 'sakura', opens: 880 },
    { id: 'basketball', opens: 610 }, { id: 'football', opens: 540 },
  ];
  const maxOpens = Math.max(...topCats.map((c) => c.opens));

  const decide = (id, verdict) => {
    setQueue((q) => q.filter((x) => x.id !== id));
    setActive(null);
    flashToast(verdict === 'approve' ? 'Spot approved & published' : 'Submission rejected');
  };

  return (
    <div className="gs-admin">
      <aside className="gs-admin-nav">
        <Logo size={26} onClick={() => go('landing')} />
        <nav>
          <a data-on><UIcon name="layers" size={17} stroke="#fff" /> Moderation</a>
          <a><UIcon name="pin" size={17} stroke={C.color.inkFaint} /> Places</a>
          <a><UIcon name="compass" size={17} stroke={C.color.inkFaint} /> Analytics</a>
          <a><UIcon name="star" size={17} stroke={C.color.inkFaint} /> Users</a>
        </nav>
        <button className="gs-admin-exit" onClick={() => go('explore')}>← Back to app</button>
      </aside>

      <main className="gs-admin-main">
        <header className="gs-admin-head">
          <div><h1>Moderation</h1><p>Review community submissions before they go live.</p></div>
          <span className="gs-admin-who"><Avatar size={28} label="A" bg={C.color.accent} /> admin</span>
        </header>

        <div className="gs-admin-stats">
          {stats.map((s) => <div key={s.l} className="gs-stat" data-accent={!!s.accent}><b>{s.n}</b><span>{s.l}</span></div>)}
        </div>

        <div className="gs-admin-grid">
          <section className="gs-admin-card">
            <div className="gs-admin-card-h"><h2>Pending queue</h2><span>{queue.length} waiting</span></div>
            <table className="gs-table">
              <thead><tr><th>Spot</th><th>Category</th><th>By</th><th>Submitted</th><th></th></tr></thead>
              <tbody>
                {queue.length === 0 && <tr><td colSpan={5} className="gs-table-empty">Queue is clear 🎉</td></tr>}
                {queue.map((q) => (
                  <tr key={q.id} data-active={active && active.id === q.id} onClick={() => setActive(q)}>
                    <td><div className="gs-table-spot"><span className="gs-table-ic" style={{ background: catColor(q.cat) }}><GemGlyph cat={q.cat} size={12} color="#fff" /></span>{q.name}{q.dupe && <span className="gs-dupe">possible dupe</span>}</div></td>
                    <td>{catMeta(q.cat).label}</td>
                    <td>{q.by}</td>
                    <td className="gs-table-when">{q.when}</td>
                    <td><span className="gs-table-go">Review →</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="gs-admin-card">
            <div className="gs-admin-card-h"><h2>Top categories</h2><span>by card opens</span></div>
            <div className="gs-bars">
              {topCats.map((c) => (
                <div key={c.id} className="gs-bar-row">
                  <span className="gs-bar-label"><span className="gs-table-ic" style={{ background: catColor(c.id) }}><GemGlyph cat={c.id} size={11} color="#fff" /></span>{catMeta(c.id).label}</span>
                  <div className="gs-bar-track"><div className="gs-bar-fill" style={{ width: `${(c.opens / maxOpens) * 100}%`, background: catColor(c.id) }} /></div>
                  <span className="gs-bar-num">{c.opens}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* review drawer */}
      {active && (
        <div className="gs-drawer-scrim" onClick={() => setActive(null)}>
          <div className="gs-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="gs-drawer-head">
              <h2>Review submission</h2>
              <button onClick={() => setActive(null)}><UIcon name="close" size={18} stroke={C.color.ink} /></button>
            </div>
            <Photo cat={active.cat} h={170} label={`${active.photos} photo${active.photos > 1 ? 's' : ''} submitted`} />
            <div className="gs-drawer-body">
              <CatBadge cat={active.cat} lg />
              <h3>{active.name}</h3>
              <div className="gs-drawer-meta"><span>{active.hood}</span><i /><span>by {active.by}</span><i /><span>{active.when}</span></div>
              <p>{active.note}</p>
              {active.dupe && <div className="gs-dupe-warn"><UIcon name="layers" size={15} stroke="#c2761a" /> A similar spot may already exist nearby — check before approving.</div>}
              <div className="gs-drawer-fields">
                <div className="gs-review-row"><span>Coordinates</span><b>59.437, 24.745</b></div>
                <div className="gs-review-row"><span>Status</span><b className="gs-pending-inline"><i /> Pending</b></div>
              </div>
            </div>
            <div className="gs-drawer-bar">
              <button className="gs-btn gs-btn-ghost gs-reject" onClick={() => decide(active.id, 'reject')}>Reject</button>
              <button className="gs-btn gs-btn-primary gs-grow" onClick={() => decide(active.id, 'approve')}>Approve & publish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Admin });
