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
