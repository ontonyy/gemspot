// Builds a MapLibre style from the static base palette (map-style.base.json)
// plus the active provider's tiles/glyphs/attribution. Keeps layer colors
// (chrome) provider-agnostic; only the `openmaptiles` source + glyphs swap.

import type { StyleSpecification } from 'maplibre-gl'
import base from './map-style.base.json'
import {
  provider,
  type MapProvider,
  type StyleChoice,
  hasMaptilerKey,
  maptilerStyleUrl,
  initialStyleChoice,
} from './provider'

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

// Map a runtime style choice to a MapLibre style: a MapTiler hosted style URL
// for a hosted choice when a key is present, otherwise the custom fg palette.
// MapLibre accepts either a StyleSpecification object or a style URL string.
export function styleForChoice(c: StyleChoice): StyleSpecification | string {
  if (c !== 'custom' && hasMaptilerKey) {
    return maptilerStyleUrl(c)
  }
  return buildStyle()
}

// Resolve the initial map style. Honors a persisted switcher choice over the
// VITE_MAP_STYLE env default (see initialStyleChoice).
export function resolveStyle(): StyleSpecification | string {
  return styleForChoice(initialStyleChoice())
}
