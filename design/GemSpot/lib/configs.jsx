/* GemSpot — the three design-direction configs. Each restyles the same
   components: palette, type, marker variant, map theme, category colors. */

// ── Direction A — Playful city guide (warm & friendly) ──────────────────────
const DIR_A = {
  key: 'A', name: 'Playful city guide',
  font: { head: '"Poppins", system-ui, sans-serif', body: '"Poppins", system-ui, sans-serif' },
  marker: 'playful',
  radius: { card: 22, chip: 100, sheet: 28, btn: 16 },
  cardStyle: 'image',
  color: {
    bg: '#fff7ef', surface: '#ffffff', surface2: '#fdf1e4',
    ink: '#3a2e23', inkSoft: '#7a6a59', inkFaint: '#a89684', line: '#f0e3d4',
    accent: '#ef7a45', accentInk: '#fff', accent2: '#f2a33c',
    chipBg: '#ffffff', chipInk: '#6b5a48', navBg: '#ffffff', star: '#f2a33c',
  },
  cat: {
    tabletennis: '#f2a33c', basketball: '#ef7a45', football: '#4fa86a', tennis: '#8fb83c',
    padel: '#3fa7a0', scenic: '#4a8fd6', sakura: '#e7799f',
  },
  map: {
    land: '#f5efe3', water: '#bfe0e3', park: '#cfe3b8', parkAlt: '#d8e9c4',
    road: '#ffffff', roadCasing: '#ece0cd', mainWidth: 7, roadMinor: '#ece1ce', minorWidth: 3.5, minorOpacity: 0.9,
    block: '#ece2d1', blockOpacity: 0.7, coast: '#9fd0d4', coastWidth: 2, coastOpacity: 0.55,
    oldTown: '#e0bd85', oldTownWidth: 2.4, oldTownDash: '5 5', oldTownOpacity: 0.85,
    labelColor: '#b09a78', labelFont: '"Poppins", sans-serif', labelOpacity: 0.7,
  },
};

// ── Direction B — Premium editorial companion (calm, refined) ───────────────
const DIR_B = {
  key: 'B', name: 'Editorial city companion',
  font: { head: '"Newsreader", Georgia, serif', body: '"Hanken Grotesk", system-ui, sans-serif' },
  marker: 'editorial',
  radius: { card: 8, chip: 6, sheet: 18, btn: 8 },
  cardStyle: 'editorial',
  color: {
    bg: '#f6f5f1', surface: '#ffffff', surface2: '#efede7',
    ink: '#22201b', inkSoft: '#6d685e', inkFaint: '#9c968a', line: '#e6e3da',
    accent: '#b5603a', accentInk: '#fff', accent2: '#22201b',
    chipBg: '#ffffff', chipInk: '#423e36', navBg: '#fbfaf7', star: '#b5603a',
  },
  cat: {
    tabletennis: '#b8893f', basketball: '#c2693f', football: '#5b7d56', tennis: '#8a8f43',
    padel: '#4f8079', scenic: '#5a7596', sakura: '#b06a82',
  },
  map: {
    land: '#f3f2ed', water: '#dde3e6', park: '#dde3d4', parkAlt: '#e4e8dd',
    road: '#ffffff', roadCasing: null, mainWidth: 5, roadMinor: '#e9e7df', minorWidth: 2, minorOpacity: 0.85,
    block: '#eceae3', blockOpacity: 0.5, coast: '#c4ced0', coastWidth: 1.4, coastOpacity: 0.7,
    oldTown: '#cdbfa6', oldTownWidth: 1.4, oldTownOpacity: 0.7,
    labelColor: '#aaa498', labelFont: '"Newsreader", serif', labelOpacity: 0.8,
  },
};

// ── Direction C — Clean geo-product with playful accents (cool, crisp) ──────
const DIR_C = {
  key: 'C', name: 'Clean geo + playful accents',
  font: { head: '"Space Grotesk", system-ui, sans-serif', body: '"Hanken Grotesk", system-ui, sans-serif' },
  marker: 'clean',
  radius: { card: 16, chip: 10, sheet: 22, btn: 12 },
  cardStyle: 'compact',
  color: {
    bg: '#f1f4f8', surface: '#ffffff', surface2: '#e9eef5',
    ink: '#19202b', inkSoft: '#5c6675', inkFaint: '#94a0b0', line: '#e4e9f0',
    accent: '#2f6fe0', accentInk: '#fff', accent2: '#1ba0a0',
    chipBg: '#ffffff', chipInk: '#3d4757', navBg: '#ffffff', star: '#f2a33c',
  },
  cat: {
    tabletennis: '#e0a32e', basketball: '#ee7733', football: '#2f9e5b', tennis: '#74b13a',
    padel: '#1ba0a0', scenic: '#3b7ddd', sakura: '#e85f9c',
  },
  map: {
    land: '#eef1f6', water: '#cfe0f2', park: '#d3e7ca', parkAlt: '#dcecd4',
    road: '#ffffff', roadCasing: '#e0e5ee', mainWidth: 7, roadMinor: '#e3e8ef', minorWidth: 3, minorOpacity: 0.9,
    block: '#e5e9f1', blockOpacity: 0.8, coast: '#9cc2e8', coastWidth: 2, coastOpacity: 0.5,
    oldTown: '#c3cdda', oldTownWidth: 2, oldTownOpacity: 0.8,
    labelColor: '#9aa6b8', labelFont: '"Space Grotesk", sans-serif', labelOpacity: 0.7,
  },
};

const GEM_DIRS = { A: DIR_A, B: DIR_B, C: DIR_C };
Object.assign(window, { DIR_A, DIR_B, DIR_C, GEM_DIRS });
