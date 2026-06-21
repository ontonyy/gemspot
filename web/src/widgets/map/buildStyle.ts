// Builds a MapLibre style from the static base palette (map-style.base.json)
// plus the active provider's tiles/glyphs/attribution. Keeps layer colors
// (chrome) provider-agnostic; only the `openmaptiles` source + glyphs swap.

import type { StyleSpecification } from 'maplibre-gl'
import base from './map-style.base.json'
import { provider, type MapProvider } from './provider'

export function buildStyle(p: MapProvider = provider): StyleSpecification {
  const s = structuredClone(base) as unknown as StyleSpecification
  s.glyphs = p.glyphs
  s.sources.openmaptiles = {
    type: 'vector',
    url: p.tiles,
    attribution: p.attribution,
  }
  return s
}
