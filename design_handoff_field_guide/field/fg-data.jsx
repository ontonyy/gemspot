/* GemSpot Field Guide — categories, glyphs, sample specimens, pin component */

// ── category glyphs (white-on-color, 24×24) ───────────────────────────────
const FG_GLYPHS = {
  tabletennis: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="9" r="5.2" fill="currentColor" stroke="none" />
      <path d="M13.3 12.4l3.9 4.1" />
      <circle cx="17.5" cy="16.8" r="1.5" fill="currentColor" stroke="none" />
    </g>
  ),
  basketball: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <circle cx="12" cy="12" r="7.3" />
      <path d="M12 4.7v14.6M4.7 12h14.6" />
      <path d="M6.8 6.8C9 9 9 15 6.8 17.2M17.2 6.8C15 9 15 15 17.2 17.2" />
    </g>
  ),
  football: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="7.3" />
      <path d="M12 8.3l3.2 2.3-1.2 3.8h-4l-1.2-3.8z" fill="currentColor" stroke="none" />
      <path d="M12 4.7v3.6M15.2 10.6l3-1M13.6 14.4l1.9 2.9M10.4 14.4l-1.9 2.9M8.8 10.6l-3-1" />
    </g>
  ),
  scenic: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16.6" cy="7.4" r="2.1" fill="currentColor" stroke="none" />
      <path d="M3.6 18.4l4.3-5.9 3 3.5 3-4.3 6.5 6.7z" fill="currentColor" stroke="none" />
    </g>
  ),
  sakura: (
    <g fill="currentColor" stroke="none">
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="12" cy="6.6" rx="2.4" ry="3.5" transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="1.8" fill="rgba(255,255,255,.92)" />
    </g>
  ),
};

// MVP taxonomy — 5 categories (per brief)
const FG_CATS = [
  { id: 'tabletennis', label: 'Table tennis', short: 'Ping pong', cssvar: '--c-tabletennis' },
  { id: 'basketball',  label: 'Basketball',   short: 'Hoops',     cssvar: '--c-basketball' },
  { id: 'football',    label: 'Football',     short: 'Football',  cssvar: '--c-football' },
  { id: 'scenic',      label: 'Viewpoint',    short: 'Views',     cssvar: '--c-scenic' },
  { id: 'sakura',      label: 'Sakura',       short: 'Sakura',    cssvar: '--c-sakura' },
];
const FG_CAT = Object.fromEntries(FG_CATS.map((c) => [c.id, c]));
const catColor = (id) => `var(${FG_CAT[id].cssvar})`;

function FgGlyph({ cat, size = 16, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color, display: 'block' }}>
      {FG_GLYPHS[cat]}
    </svg>
  );
}

// ── sample specimens (real-ish Tallinn spots). x/y are % on the map canvas ──
const FG_PLACES = [
  { id: 1,  no: '01', name: 'Politseiaia ping-pong', cat: 'tabletennis', area: 'Kesklinn',  km: 0.4, saves: 38,  x: 38, y: 54,
    tags: ['Free', 'Concrete', 'Lit'], note: 'Two weather-worn outdoor tables tucked behind the police garden. Quiet on weekday mornings, busy after 18:00 when the after-work crowd rolls in.', by: 'maris_t', verified: '12 days ago', best: 'Eve', lit: 'Yes', cost: 'Free' },
  { id: 2,  no: '02', name: 'Kanuti aed blossoms',   cat: 'sakura',      area: 'Kesklinn',  km: 0.5, saves: 96,  x: 52, y: 38,
    tags: ['Seasonal', 'Late Apr'], note: 'A short row of cherry trees along the old bastion wall. Peak bloom lasts roughly ten days; go early to beat the photographers.', by: 'tallinn_walks', verified: '4 days ago', best: 'Apr', lit: 'No', cost: 'Free' },
  { id: 3,  no: '03', name: 'Patkuli viewpoint',     cat: 'scenic',      area: 'Toompea',   km: 0.7, saves: 142, x: 30, y: 30,
    tags: ['Free', 'Sunset', 'Rooftops'], note: 'The classic red-roof panorama over the lower town and harbour. North-facing, so best at golden hour rather than true sunset.', by: 'gemspot_team', verified: '2 days ago', best: 'Dusk', lit: 'No', cost: 'Free' },
  { id: 4,  no: '04', name: 'Politseipark hoops',    cat: 'basketball',  area: 'Kesklinn',  km: 0.8, saves: 21,  x: 46, y: 62,
    tags: ['Free', 'Full court'], note: 'Single full court with fresh nets as of this spring. Surface drains well, so it dries fast after rain.', by: 'hoops_ee', verified: '9 days ago', best: 'Day', lit: 'Yes', cost: 'Free' },
  { id: 5,  no: '05', name: 'Kalamaja sea terrace',  cat: 'scenic',      area: 'Kalamaja',  km: 1.6, saves: 88,  x: 18, y: 18,
    tags: ['Sunset', 'Coast'], note: 'Low wooden terraces facing west over the bay. The actual sunset spot locals use, away from the busy promenade.', by: 'noor.k', verified: '6 days ago', best: 'Dusk', lit: 'No', cost: 'Free' },
  { id: 6,  no: '06', name: 'Löwenruh pitch',        cat: 'football',    area: 'Kristiine', km: 2.3, saves: 34,  x: 70, y: 70,
    tags: ['Free', 'Grass'], note: 'Full-size grass pitch beside the park pond. Open for pickup games when the clubs are not training.', by: 'fc_local', verified: '15 days ago', best: 'Eve', lit: 'No', cost: 'Free' },
  { id: 7,  no: '07', name: 'Snelli pond tables',    cat: 'tabletennis', area: 'Kesklinn',  km: 0.9, saves: 52,  x: 44, y: 44,
    tags: ['Free', 'Shaded'], note: 'Three tables under the trees by Snelli pond. Shaded all afternoon, which makes it the summer favourite.', by: 'maris_t', verified: '3 days ago', best: 'Day', lit: 'No', cost: 'Free' },
  { id: 8,  no: '08', name: 'Hirvepark hoops',       cat: 'basketball',  area: 'Toompea',   km: 0.6, saves: 29,  x: 36, y: 46,
    tags: ['Free', 'Half court'], note: 'Half court on the slope below the park. Rim is a touch low — good for a casual shoot-around.', by: 'hoops_ee', verified: '20 days ago', best: 'Day', lit: 'Yes', cost: 'Free' },
  { id: 9,  no: '09', name: 'Lasnamäe cliff view',   cat: 'scenic',      area: 'Lasnamäe',  km: 4.1, saves: 67,  x: 86, y: 40,
    tags: ['Free', 'Industrial'], note: 'Limestone escarpment looking back at the city skyline. Raw, a little industrial, and almost always empty.', by: 'noor.k', verified: '11 days ago', best: 'Day', lit: 'No', cost: 'Free' },
  { id: 10, no: '10', name: 'Tammsaare cherries',    cat: 'sakura',      area: 'Kesklinn',  km: 0.3, saves: 113, x: 56, y: 56,
    tags: ['Seasonal', 'Late Apr', 'Central'], note: 'The most photographed blossoms in town, ringing the park fountain. Crowded at peak, but worth one early visit.', by: 'tallinn_walks', verified: '5 days ago', best: 'Apr', lit: 'Yes', cost: 'Free' },
];

// ── specimen pin (map tack) ───────────────────────────────────────────────
function FgPin({ place, selected, saved, onClick }) {
  return (
    <div className="fg-pin" data-sel={selected} data-saved={saved}
      style={{ left: place.x + '%', top: place.y + '%', '--pc': catColor(place.cat) }}>
      <button className="fg-pinbtn" onClick={onClick} aria-label={place.name}>
        <span className="fg-pin-disc"><FgGlyph cat={place.cat} size={selected ? 22 : 16} /></span>
        <span className="fg-pin-stem" />
        {selected && <span className="fg-pin-tag mono">{place.name}</span>}
      </button>
    </div>
  );
}

// riso-tinted photo placeholder
function FgPhoto({ cat, label, className = '', glyph = true }) {
  return (
    <div className={'fg-photo ' + className} style={{ '--pc': catColor(cat) }}>
      {glyph && <span className="fg-photo-glyph"><FgGlyph cat={cat} size={26} color={catColor(cat)} /></span>}
      {label && <span className="fg-photo-label">{label}</span>}
    </div>
  );
}

Object.assign(window, { FG_GLYPHS, FG_CATS, FG_CAT, catColor, FgGlyph, FG_PLACES, FgPin, FgPhoto });
