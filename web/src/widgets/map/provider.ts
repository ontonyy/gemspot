// Map tile/style provider seam. Lets the basemap source (tiles + glyphs +
// attribution) swap between vendors without touching the layer palette in
// map-style.base.json. ACTIVE is chosen at build time via VITE_MAP_PROVIDER;
// default is OpenFreeMap so the seam is behavior-neutral until wired.

export type Provider = 'openfreemap' | 'maptiler' | 'mapbox' | 'selfhosted'

export interface MapProvider {
  /** TileJSON / vector tile URL for the `openmaptiles` source. */
  tiles: string
  /** Glyphs (font PBF) URL template. */
  glyphs: string
  /** Attribution string for the source. */
  attribution: string
}

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY ?? ''

export const PROVIDERS: Record<Provider, MapProvider> = {
  openfreemap: {
    tiles: 'https://tiles.openfreemap.org/planet',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    attribution:
      '© <a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  maptiler: {
    tiles: `https://api.maptiler.com/tiles/v3/tiles.json?key=${MAPTILER_KEY}`,
    glyphs: `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${MAPTILER_KEY}`,
    attribution:
      '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  selfhosted: {
    tiles: import.meta.env.VITE_SELFHOST_TILES ?? '',
    glyphs: import.meta.env.VITE_SELFHOST_GLYPHS ?? '',
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  mapbox: {
    // TODO: mapbox:// rewrite + token. mapbox:// URLs need expansion to
    // https://api.mapbox.com/v4/{id}.json?access_token=... and glyphs/sprite
    // rewriting; stub until a Mapbox token + transformRequest are in place.
    tiles: '',
    glyphs: '',
    attribution:
      '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
}

export const ACTIVE: Provider =
  (import.meta.env.VITE_MAP_PROVIDER as Provider) ?? 'openfreemap'

export const provider: MapProvider = PROVIDERS[ACTIVE]

export const FALLBACK: MapProvider = PROVIDERS.openfreemap

// ── Option A: MapTiler hosted styles ──────────────────────────────────────
// Ready-made full style.json from MapTiler (basemap colors + layers baked in).
// When VITE_MAP_STYLE names one of these, the map loads the hosted style URL
// instead of the custom monochrome base palette (map-style.base.json). Branded
// HTML markers are independent of the basemap, so they render on any style.
// Requires VITE_MAPTILER_KEY. Falls back to the custom palette if unset.
export const MAPTILER_STYLES = {
  streets: 'streets-v2',
  outdoor: 'outdoor-v2',
  satellite: 'hybrid',
} as const
export type MaptilerStyle = keyof typeof MAPTILER_STYLES

/** Selected hosted style, or 'custom'/undefined to keep the fg palette. */
export const STYLE = import.meta.env.VITE_MAP_STYLE as
  | MaptilerStyle
  | 'custom'
  | undefined

export const hasMaptilerKey = MAPTILER_KEY !== ''

export function maptilerStyleUrl(s: MaptilerStyle): string {
  return `https://api.maptiler.com/maps/${MAPTILER_STYLES[s]}/style.json?key=${MAPTILER_KEY}`
}

// ── Runtime style switcher (persisted choice) ─────────────────────────────
// The user can swap the basemap live (SpotMap switcher). 'custom' = the fg
// monochrome palette; a MaptilerStyle = a hosted style. The pick is stored so
// it survives reloads and overrides VITE_MAP_STYLE on the next mount.
export type StyleChoice = 'custom' | MaptilerStyle

const STYLE_STORAGE_KEY = 'gemspot:map-style'

function isMaptilerStyle(s: string): s is MaptilerStyle {
  return Object.prototype.hasOwnProperty.call(MAPTILER_STYLES, s)
}

/** Stored choice, or null when none/invalid/hosted-without-key. */
export function loadStyleChoice(): StyleChoice | null {
  try {
    const v = localStorage.getItem(STYLE_STORAGE_KEY)
    if (v === 'custom') return 'custom'
    if (v && isMaptilerStyle(v) && hasMaptilerKey) return v
  } catch {
    // ignore unavailable/blocked storage
  }
  return null
}

export function saveStyleChoice(c: StyleChoice): void {
  try {
    localStorage.setItem(STYLE_STORAGE_KEY, c)
  } catch {
    // ignore unavailable/blocked storage
  }
}

// Effective initial choice: stored pick wins, else VITE_MAP_STYLE, else custom.
export function initialStyleChoice(): StyleChoice {
  const stored = loadStyleChoice()
  if (stored) return stored
  if (STYLE && STYLE !== 'custom' && hasMaptilerKey) return STYLE
  return 'custom'
}
