/* GemSpot Web — responsive map. Renders TallinnMap cover-scaled to fill any
   container, positions category markers in the same coordinate space (so they
   always sit on the right map features), clusters nearby pins, and supports
   hover-sync + selection. Also used as the landing hero map. */

// Greedy proximity clustering in data-% space.
function clusterSpots(spots, threshold) {
  const used = new Set(); const groups = [];
  for (const s of spots) {
    if (used.has(s.id)) continue;
    const members = [s]; used.add(s.id);
    for (const o of spots) {
      if (used.has(o.id)) continue;
      const dx = s.x - o.x, dy = s.y - o.y;
      if (Math.sqrt(dx * dx + dy * dy) < threshold) { members.push(o); used.add(o.id); }
    }
    const cx = members.reduce((a, m) => a + m.x, 0) / members.length;
    const cy = members.reduce((a, m) => a + m.y, 0) / members.length;
    groups.push({ members, x: cx, y: cy, id: members.map((m) => m.id).join('_') });
  }
  return groups;
}

function WebMap({
  spots, selectedId, hoverId, onSelectSpot, onHoverSpot,
  cluster = true, interactive = true, showLabels = true, dim = false,
  pinMode = false, pinPos, onPlacePin, controls = true, showMe = true,
}) {
  const wrapRef = React.useRef(null);
  const [box, setBox] = React.useState({ w: 800, h: 600 });
  const [openCluster, setOpenCluster] = React.useState(null);

  React.useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // cover-fit the 390×760 map world into the container
  const ratio = 390 / 760;
  const scale = Math.max(box.w / 390, box.h / 760);
  const layerW = 390 * scale, layerH = 760 * scale;
  const offX = (box.w - layerW) / 2, offY = (box.h - layerH) / 2;
  const px = (x) => offX + (x / 100) * layerW;
  const py = (y) => offY + (y / 100) * layerH;

  const groups = cluster ? clusterSpots(spots, 6.5) : spots.map((s) => ({ members: [s], x: s.x, y: s.y, id: s.id }));

  const handleMapClick = (e) => {
    if (!pinMode || !onPlacePin) return;
    const r = wrapRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - r.left - offX) / layerW) * 100;
    const yPct = ((e.clientY - r.top - offY) / layerH) * 100;
    onPlacePin({ x: Math.max(4, Math.min(96, xPct)), y: Math.max(4, Math.min(96, yPct)) });
  };

  return (
    <div ref={wrapRef} className="gs-map" data-pin={pinMode}
      onClick={(e) => { if (e.target === e.currentTarget || e.target.closest('.gs-mapbg')) { setOpenCluster(null); if (!pinMode) onSelectSpot && onSelectSpot(null); handleMapClick(e); } }}>
      {/* base map (cover-scaled world) */}
      <div className="gs-mapbg" style={{ position: 'absolute', left: offX, top: offY, width: layerW, height: layerH }}>
        <TallinnMap theme={C.map} showLabels={showLabels} />
      </div>
      {dim && <div className="gs-mapdim" />}

      {/* my-location dot */}
      {showMe && !pinMode && (
        <div className="gs-me" style={{ left: px(44), top: py(50) }}><span /></div>
      )}

      {/* markers / clusters */}
      {!pinMode && groups.map((g) => {
        const isCluster = g.members.length > 1;
        const left = px(g.x), top = py(g.y);
        if (isCluster) {
          const containsSel = g.members.some((m) => m.id === selectedId);
          return (
            <div key={g.id} className="gs-pin" style={{ left, top, zIndex: openCluster === g.id ? 60 : 20 }}>
              <button className="gs-cluster" data-active={containsSel || openCluster === g.id}
                onClick={(e) => { e.stopPropagation(); setOpenCluster(openCluster === g.id ? null : g.id); }}>
                <span className="gs-cluster-dots">
                  {g.members.slice(0, 3).map((m) => <i key={m.id} style={{ background: catColor(m.cat) }} />)}
                </span>
                {g.members.length}
              </button>
              {openCluster === g.id && (
                <div className="gs-cluster-pop" onClick={(e) => e.stopPropagation()}>
                  <div className="gs-cluster-pop-h">{g.members.length} spots here</div>
                  {g.members.map((m) => (
                    <button key={m.id} className="gs-cluster-row" onClick={() => { onSelectSpot && onSelectSpot(m.id); setOpenCluster(null); }}>
                      <span className="gs-cluster-ic" style={{ background: catColor(m.cat) }}><GemGlyph cat={m.cat} size={12} color="#fff" /></span>
                      <span className="gs-cluster-name">{m.name}</span>
                      <span className="gs-cluster-dist">{distLabel(m.id)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }
        const m = g.members[0];
        const sel = m.id === selectedId, hov = m.id === hoverId;
        return (
          <div key={m.id} className="gs-pin" style={{ left, top, zIndex: sel ? 50 : hov ? 40 : 20 }}
            onMouseEnter={() => onHoverSpot && onHoverSpot(m.id)} onMouseLeave={() => onHoverSpot && onHoverSpot(null)}
            onClick={(e) => { e.stopPropagation(); onSelectSpot && onSelectSpot(m.id); }}>
            <GemMarker cat={m.cat} color={catColor(m.cat)} variant="clean"
              size={sel ? 32 : hov ? 30 : 27} state={sel ? 'selected' : 'default'}
              label={sel ? m.name : undefined} />
          </div>
        );
      })}

      {/* add-a-spot draggable pin */}
      {pinMode && pinPos && (
        <div className="gs-pin gs-pin-place" style={{ left: px(pinPos.x), top: py(pinPos.y), zIndex: 60 }}>
          <GemMarker cat="scenic" color={C.color.accent} variant="clean" size={40} state="selected" label="Tap map to move" />
        </div>
      )}
      {pinMode && !pinPos && (
        <div className="gs-pin-hint">Tap anywhere on the map to drop your pin</div>
      )}

      {/* floating controls */}
      {controls && !pinMode && (
        <div className="gs-mapctl">
          <button title="Layers"><UIcon name="layers" size={19} stroke={C.color.ink} /></button>
          <button data-on title="My location"><UIcon name="location" size={19} stroke={C.color.accent} /></button>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { WebMap, clusterSpots });
