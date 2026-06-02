/* GemSpot — hand-built stylized map of central Tallinn.
   Abstract/cartographic, not geographically exact: Tallinn Bay + coastline
   to the north, Old Town core, Toompea, Snelli pond, Kadriorg park to the
   east, a few arteries and a minor-street grid for urban texture.
   Fully themeable so each design direction restyles the same geometry. */

// Deterministic pseudo-random for stable street texture.
function gemRng(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// Minor-street grid (generated once, perturbed for an organic feel).
function gemMinorStreets() {
  const rnd = gemRng(7);
  const lines = [];
  // gently curved horizontals
  for (let i = 0; i < 9; i++) {
    const y = 200 + i * 62 + (rnd() - 0.5) * 18;
    const c1 = y + (rnd() - 0.5) * 40, c2 = y + (rnd() - 0.5) * 40;
    lines.push(`M-10 ${y.toFixed(0)} C 120 ${c1.toFixed(0)}, 270 ${c2.toFixed(0)}, 400 ${(y + (rnd() - 0.5) * 30).toFixed(0)}`);
  }
  // verticals
  for (let i = 0; i < 7; i++) {
    const x = 30 + i * 58 + (rnd() - 0.5) * 16;
    const c1 = x + (rnd() - 0.5) * 36, c2 = x + (rnd() - 0.5) * 36;
    lines.push(`M${x.toFixed(0)} 180 C ${c1.toFixed(0)} 360, ${c2.toFixed(0)} 540, ${(x + (rnd() - 0.5) * 30).toFixed(0)} 780`);
  }
  return lines;
}
const GEM_STREETS = gemMinorStreets();

// Default spot coordinates (% of map box) — shared across directions.
const GEM_SPOTS = [
  { id: 's1', cat: 'tabletennis', name: 'Politsei­aia ping-pong', hood: 'Kesklinn', x: 41, y: 46, rating: 4.6, saves: 38, photos: 3, tags: ['Free', 'Concrete', 'Lit at night'], note: 'Two weatherproof tables tucked behind the park benches — quiet on weekday mornings.' },
  { id: 's2', cat: 'basketball', name: 'Kalamaja court', hood: 'Kalamaja', x: 20, y: 33, rating: 4.4, saves: 52, photos: 5, tags: ['Full court', 'Free', 'Lights'], note: 'Resurfaced 2024. Pickup games most evenings after 18:00.' },
  { id: 's3', cat: 'football', name: 'Kalevi väljak', hood: 'Juhkentali', x: 58, y: 64, rating: 4.7, saves: 71, photos: 6, tags: ['Turf', 'Bookable', 'Changing rooms'], note: 'Full-size 3G pitch. Drop-in slots Sun mornings.' },
  { id: 's4', cat: 'tennis', name: 'Kadrioru tennis', hood: 'Kadriorg', x: 76, y: 60, rating: 4.5, saves: 29, photos: 4, tags: ['Clay', 'Seasonal', 'Rentals'], note: 'Six clay courts by the park edge. Book a day ahead in summer.' },
  { id: 's5', cat: 'padel', name: 'Noblessner padel', hood: 'Põhja-Tallinn', x: 30, y: 17, rating: 4.8, saves: 64, photos: 4, tags: ['Indoor', 'Bookable', 'Gear hire'], note: 'Four glass courts by the seafront promenade.' },
  { id: 's6', cat: 'scenic', name: 'Patkuli viewpoint', hood: 'Toompea', x: 34, y: 39, rating: 4.9, saves: 142, photos: 9, tags: ['Free', 'Sunset', 'Old Town view'], note: 'The classic red-roof panorama over the lower town and harbour.' },
  { id: 's7', cat: 'scenic', name: 'Kohtuotsa terrace', hood: 'Toompea', x: 39, y: 35, rating: 4.8, saves: 118, photos: 7, tags: ['Free', 'Busy', 'Photo spot'], note: 'Wide deck over the rooftops — go early to beat the tour groups.' },
  { id: 's8', cat: 'sakura', name: 'Kanuti aed blossoms', hood: 'Kesklinn', x: 47, y: 41, rating: 4.7, saves: 96, photos: 12, tags: ['Seasonal', 'Late April', 'Free'], note: 'A short avenue of cherry trees — peak bloom usually the last week of April.' },
  { id: 's9', cat: 'sakura', name: 'Kadriorg cherry walk', hood: 'Kadriorg', x: 82, y: 49, rating: 4.6, saves: 88, photos: 10, tags: ['Seasonal', 'Park', 'Free'], note: 'Cherry rows near the swan pond, busiest on the first warm weekend.' },
  { id: 's10', cat: 'basketball', name: 'Politseipark hoops', hood: 'Kesklinn', x: 50, y: 54, rating: 4.2, saves: 21, photos: 2, tags: ['Half court', 'Free'], note: 'Single hoop, smooth asphalt — good for a quick shoot-around.' },
];

// TallinnMap — fills its container. theme controls all colors + texture feel.
function TallinnMap({ theme, style = {}, showLabels = true }) {
  const t = theme;
  const lbl = (x, y, text, size, rot = 0) => (
    <text x={x} y={y} fontSize={size} fill={t.labelColor} fontWeight="600"
      letterSpacing="0.06em" textAnchor="middle" transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}
      style={{ textTransform: 'uppercase', fontFamily: t.labelFont || 'inherit' }} opacity={t.labelOpacity ?? 0.75}>{text}</text>
  );
  return (
    <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', ...style }}>
      {/* land base */}
      <rect x="0" y="0" width="390" height="760" fill={t.land} />

      {/* subtle building-block texture */}
      {t.block && (
        <g fill={t.block} opacity={t.blockOpacity ?? 1}>
          {(() => {
            const rnd = gemRng(31); const r = [];
            for (let i = 0; i < 46; i++) {
              const x = rnd() * 390, y = 190 + rnd() * 560;
              const w = 14 + rnd() * 26, h = 12 + rnd() * 22;
              r.push(<rect key={i} x={x.toFixed(0)} y={y.toFixed(0)} width={w.toFixed(0)} height={h.toFixed(0)} rx="2.5" />);
            }
            return r;
          })()}
        </g>
      )}

      {/* minor streets */}
      <g fill="none" stroke={t.roadMinor} strokeWidth={t.minorWidth ?? 3} strokeLinecap="round" opacity={t.minorOpacity ?? 1}>
        {GEM_STREETS.map((d, i) => <path key={i} d={d} />)}
      </g>

      {/* main arteries — casing then fill */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {t.roadCasing && (
          <g stroke={t.roadCasing} strokeWidth={t.mainWidth + 3}>
            <path d="M-10 300 C 120 250, 200 360, 300 300 C 360 270, 380 250, 410 240" />
            <path d="M150 -10 C 160 160, 120 360, 180 560 C 210 670, 180 740, 200 780" />
            <path d="M-10 560 C 120 540, 250 600, 410 520" />
          </g>
        )}
        <g stroke={t.road} strokeWidth={t.mainWidth}>
          <path d="M-10 300 C 120 250, 200 360, 300 300 C 360 270, 380 250, 410 240" />
          <path d="M150 -10 C 160 160, 120 360, 180 560 C 210 670, 180 740, 200 780" />
          <path d="M-10 560 C 120 540, 250 600, 410 520" />
        </g>
      </g>

      {/* parks / green */}
      <g fill={t.park}>
        {/* Kadriorg (large, east) */}
        <path d="M250 470 C 300 440, 390 450, 400 500 L 410 640 C 410 700, 320 700, 280 670 C 240 640, 220 520, 250 470 Z" />
        {/* Toompark strip near coast */}
        <path d="M40 200 C 90 190, 150 210, 150 240 C 150 270, 90 270, 50 255 C 25 245, 15 210, 40 200 Z" fill={t.parkAlt || t.park} />
        {/* small green near center */}
        <ellipse cx="250" cy="380" rx="34" ry="26" fill={t.parkAlt || t.park} />
        {/* Hirvepark west */}
        <path d="M70 410 C 110 400, 130 430, 120 460 C 108 490, 60 485, 52 450 C 48 425, 50 415, 70 410 Z" fill={t.parkAlt || t.park} />
      </g>

      {/* water — bay + coastline */}
      <path d="M-10 -10 H400 V118 C 350 150, 318 124, 286 148 C 250 174, 224 138, 178 160 C 138 178, 104 146, 64 164 C 36 176, 14 156, -10 166 Z"
        fill={t.water} />
      {/* harbour inlet */}
      <path d="M300 120 C 330 130, 352 128, 360 150 C 366 172, 344 210, 322 214 C 300 218, 296 188, 300 160 Z" fill={t.water} />
      {/* Snelli pond */}
      <ellipse cx="120" cy="300" rx="30" ry="15" fill={t.water} transform="rotate(-18 120 300)" />
      {/* Swan pond in Kadriorg */}
      <ellipse cx="318" cy="560" rx="20" ry="13" fill={t.water} />

      {/* coastline accent */}
      {t.coast && (
        <path d="M400 118 C 350 150, 318 124, 286 148 C 250 174, 224 138, 178 160 C 138 178, 104 146, 64 164 C 36 176, 14 156, -10 166"
          fill="none" stroke={t.coast} strokeWidth={t.coastWidth ?? 2} strokeLinecap="round" opacity={t.coastOpacity ?? 0.6} />
      )}

      {/* Old Town wall ring (medieval core hint) */}
      {t.oldTown && (
        <path d="M150 250 C 185 244, 210 270, 206 305 C 202 340, 170 360, 140 350 C 112 340, 100 300, 112 274 C 122 256, 134 252, 150 250 Z"
          fill={t.oldTownFill || 'none'} stroke={t.oldTown} strokeWidth={t.oldTownWidth ?? 2}
          strokeDasharray={t.oldTownDash || 'none'} opacity={t.oldTownOpacity ?? 0.8} />
      )}

      {/* labels */}
      {showLabels && (
        <g>
          {lbl(70, 95, 'Tallinn Bay', 11)}
          {lbl(158, 305, 'Old Town', 9.5, -6)}
          {lbl(330, 600, 'Kadriorg', 10, 0)}
          {lbl(60, 430, 'Hirve­park', 7.5)}
          {lbl(250, 720, 'Juhkentali', 8)}
          {lbl(40, 600, 'Kassisaba', 8, -4)}
        </g>
      )}
    </svg>
  );
}

Object.assign(window, { GEM_SPOTS, TallinnMap, gemRng });
