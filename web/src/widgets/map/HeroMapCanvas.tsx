/* Stylised cartographic map of central Tallinn — survey-paper base, hatched
   water, contoured hill, coordinate grid. Static decorative SVG (no map lib),
   used behind the landing hero pins. Ink drawn with currentColor.
   Ported 1:1 from design_handoff_field_guide/field/fg-map.jsx (FgMapCanvas). */
export function HeroMapCanvas() {
  return (
    <svg viewBox="0 0 1000 680" preserveAspectRatio="xMidYMid slice" style={{ color: 'var(--ink)' }}>
      <defs>
        <pattern id="fgWater" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="9" height="9" fill="var(--paper-3)" />
          <line x1="0" y1="0" x2="0" y2="9" stroke="currentColor" strokeWidth="0.6" opacity="0.16" />
        </pattern>
        <pattern id="fgPark" width="13" height="13" patternUnits="userSpaceOnUse">
          <rect width="13" height="13" fill="color-mix(in oklch, var(--c-football) 13%, var(--paper))" />
          <circle cx="3" cy="3" r="0.9" fill="var(--c-football)" opacity="0.34" />
          <circle cx="9.5" cy="8.5" r="0.9" fill="var(--c-football)" opacity="0.34" />
        </pattern>
      </defs>

      <rect x="0" y="0" width="1000" height="680" fill="var(--paper)" />

      <g stroke="currentColor" strokeWidth="0.75" opacity="0.10">
        {[140, 340, 540, 740, 940].map((x) => <line key={'v' + x} x1={x} y1="0" x2={x} y2="680" />)}
        {[110, 270, 430, 590].map((y) => <line key={'h' + y} x1="0" y1={y} x2="1000" y2={y} />)}
      </g>
      <g fontFamily="var(--font-mono)" fontSize="10" fill="currentColor" opacity="0.32" letterSpacing="0.04em">
        <text x="146" y="20">24.73°E</text>
        <text x="546" y="20">24.75°E</text>
        <text x="946" y="20" textAnchor="end">24.77°E</text>
        <text x="8" y="116">59.44°N</text>
        <text x="8" y="436">59.43°N</text>
      </g>

      <path d="M0,0 L420,0 C360,70 250,120 150,150 C70,175 20,210 0,250 Z" fill="url(#fgWater)" />
      <path d="M0,0 L420,0 C360,70 250,120 150,150 C70,175 20,210 0,250"
        fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.4"
        strokeDasharray="6 5" strokeLinecap="round" />
      <text x="150" y="60" fontFamily="var(--font-mono)" fontSize="13" fill="currentColor"
        opacity="0.34" letterSpacing="0.3em">TALLINN  BAY</text>

      <path d="M250,250 C320,210 430,220 470,280 C500,330 460,400 380,410 C300,418 230,370 230,320 C230,295 235,262 250,250 Z" fill="url(#fgPark)" stroke="var(--c-football)" strokeWidth="1" opacity="0.92" />
      <path d="M640,420 C720,400 810,430 830,500 C845,560 790,615 710,610 C640,605 600,560 600,505 C600,470 605,440 640,420 Z" fill="url(#fgPark)" stroke="var(--c-football)" strokeWidth="1" opacity="0.92" />
      <ellipse cx="560" cy="560" rx="90" ry="64" fill="url(#fgPark)" stroke="var(--c-football)" strokeWidth="1" opacity="0.9" />

      <g fill="none" stroke="currentColor" opacity="0.22" strokeWidth="1">
        <ellipse cx="300" cy="215" rx="150" ry="105" />
        <ellipse cx="300" cy="215" rx="116" ry="80" />
        <ellipse cx="300" cy="215" rx="84" ry="57" />
        <ellipse cx="300" cy="215" rx="52" ry="35" />
        <ellipse cx="300" cy="215" rx="24" ry="16" />
      </g>
      <text x="300" y="120" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11"
        fill="currentColor" opacity="0.4" letterSpacing="0.22em">TOOMPEA · 48m</text>

      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M150,150 C300,260 430,300 560,360 C690,420 820,430 1000,400" strokeWidth="3" opacity="0.34" />
        <path d="M420,0 C440,120 470,260 520,400 C560,520 600,600 640,680" strokeWidth="3" opacity="0.34" />
        <path d="M0,470 C200,440 380,470 560,460 C740,450 880,470 1000,520" strokeWidth="3" opacity="0.34" />
        <g strokeWidth="1.4" opacity="0.2">
          <path d="M300,215 L420,300 M300,215 L210,300 M300,215 L300,90" />
          <path d="M560,360 L560,560 M520,400 L380,410 M640,420 L560,460" />
          <path d="M150,150 L80,260 M860,470 L920,400 M700,610 L640,680" />
          <path d="M470,280 L640,420 M380,410 L300,500 M830,500 L1000,520" />
        </g>
      </g>

      <path d="M380,420 C360,360 380,300 440,290 C500,282 560,310 575,370 C588,425 555,485 490,495 C430,504 398,475 380,420 Z"
        fill="color-mix(in oklch, var(--paper-2) 70%, transparent)"
        stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.5" />
      <text x="478" y="395" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11"
        fill="currentColor" opacity="0.46" letterSpacing="0.16em">OLD TOWN</text>

      <g fontFamily="var(--font-mono)" fontSize="11" fill="currentColor" opacity="0.3" letterSpacing="0.18em">
        <text x="120" y="210">KALAMAJA</text>
        <text x="700" y="300">KESKLINN</text>
        <text x="720" y="540">KRISTIINE</text>
        <text x="300" y="330">HIRVEPARK</text>
      </g>
    </svg>
  )
}
