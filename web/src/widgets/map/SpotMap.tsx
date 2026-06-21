/* SpotMap — MapLibre GL + OpenFreeMap basemap, bounded to Tallinn, with
   branded HTML markers (fg disc + glyph + ink stem, 4 states) and native
   GeoJSON clustering rendered as fg count-pills.

   Marker strategy (CONTEXT decision): GeoJSON source `cluster:true` does the
   grouping + cluster-expansion-zoom; we render every visible feature as an
   `maplibregl.Marker` HTML overlay (pixel-perfect fg pin / cluster pill) by
   reading `querySourceFeatures` on each render. React roots are cached per
   marker id and only re-rendered when their visual state key changes. */

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { createRoot, type Root } from 'react-dom/client'
import { CategoryGlyph, catColor, type CategoryId } from '../../entities/place/categories'
import { TALLINN_CENTER } from '../../shared/lib/geo'
import { track } from '../../shared/api/track'
import { buildStyle, resolveStyle, styleForChoice } from './buildStyle'
import {
  ACTIVE,
  FALLBACK,
  hasMaptilerKey,
  initialStyleChoice,
  saveStyleChoice,
  type StyleChoice,
} from './provider'

// Runtime basemap switcher options. Hosted entries need a MapTiler key and are
// disabled without one; 'custom' is the always-available fg monochrome palette.
const STYLE_OPTIONS: { id: StyleChoice; label: string; hosted: boolean }[] = [
  { id: 'custom', label: 'Field guide', hosted: false },
  { id: 'streets', label: 'Streets', hosted: true },
  { id: 'outdoor', label: 'Outdoor', hosted: true },
  { id: 'satellite', label: 'Satellite', hosted: true },
]

/** Browser WebGL capability — maplibre needs it; without it the canvas is a
    silent white box. Detect up-front so we can show a fallback instead. */
function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

export interface SpotMapItem {
  slug: string
  name: string
  lat: number
  lng: number
  category: { id: CategoryId }
  isSaved?: boolean
}

interface SpotMapProps {
  items: SpotMapItem[]
  selectedSlug?: string | null
  /** Slug from a *detail open* (route /spot/:slug) — flies the map to the spot
      and dims the others. Distinct from selectedSlug (which also fires on hover)
      so hover-only selection never moves the viewport. */
  focusSlug?: string | null
  onSelect?: (slug: string) => void
}

const SOURCE = 'spots'
// Tallinn frame — center + a hard pan limit so the discovery map stays local.
const CENTER: [number, number] = [TALLINN_CENTER.lng, TALLINN_CENTER.lat]
const MAX_BOUNDS: maplibregl.LngLatBoundsLike = [
  [24.55, 59.36],
  [24.95, 59.5],
]

/* ── pin (unclustered specimen) — fg.css .fg-pin spec ────────────────────── */
function SpotPin({
  cat,
  name,
  selected,
  saved,
  dim,
}: {
  cat: CategoryId
  name: string
  selected: boolean
  saved: boolean
  dim: boolean
}) {
  return (
    <div
      className="fg-pin"
      data-sel={selected}
      data-saved={saved}
      data-dim={dim}
      style={{ position: 'relative', '--pc': catColor(cat) } as React.CSSProperties}
    >
      <div className="fg-pinbtn">
        <span className="fg-pin-disc">
          <CategoryGlyph cat={cat} size={selected ? 22 : 16} />
        </span>
        <span className="fg-pin-stem" />
        {selected && <span className="fg-pin-tag mono">{name}</span>}
      </div>
    </div>
  )
}

/* ── cluster count-pill — docs/01 §4 spec ────────────────────────────────── */
function ClusterPill({
  count,
  dots,
  active,
  dim,
}: {
  count: number
  dots: CategoryId[]
  active: boolean
  dim: boolean
}) {
  return (
    <div className="fg-cluster" data-active={active} data-dim={dim}>
      <span className="fg-cluster-dots">
        {dots.slice(0, 3).map((c, i) => (
          <i key={i} style={{ '--dc': catColor(c) } as React.CSSProperties} />
        ))}
      </span>
      <span className="fg-cluster-n">{count}</span>
    </div>
  )
}

interface MarkerRec {
  marker: maplibregl.Marker
  root: Root
  key: string
}

export function SpotMap({ items, selectedSlug, focusSlug, onSelect }: SpotMapProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<Map<string, MarkerRec>>(new Map())
  const onScreenRef = useRef<Set<string>>(new Set())
  // latest props read inside event handlers without re-binding listeners
  const selectedRef = useRef<string | null | undefined>(selectedSlug)
  const focusRef = useRef<string | null | undefined>(focusSlug)
  const onSelectRef = useRef<typeof onSelect>(onSelect)
  const itemsRef = useRef<SpotMapItem[]>(items)
  // one-shot: if a non-OFM provider errors, swap to OFM style exactly once
  const triedFallback = useRef(false)
  // live basemap choice (switcher) — ref mirrors it for the error handler
  const styleChoiceRef = useRef<StyleChoice>(initialStyleChoice())
  selectedRef.current = selectedSlug
  focusRef.current = focusSlug
  onSelectRef.current = onSelect
  itemsRef.current = items

  // 'loading' until the style paints; 'error' on WebGL-missing / init throw /
  // load timeout → render a visible fallback instead of a silent white box.
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retry, setRetry] = useState(0)
  const [styleChoice, setStyleChoice] = useState<StyleChoice>(() => initialStyleChoice())

  // ── init map once (re-runs on retry) ─────────────────────────────────────
  useEffect(() => {
    if (!hostRef.current) return
    if (!webglAvailable()) { setStatus('error'); return }
    setStatus('loading')

    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: hostRef.current,
        style: resolveStyle(),
        center: CENTER,
        zoom: 12.4,
        minZoom: 10,
        maxZoom: 18,
        maxBounds: MAX_BOUNDS,
        attributionControl: { compact: true },
      })
    } catch (err) {
      console.warn('[SpotMap] init failed', err)
      setStatus('error')
      return
    }
    mapRef.current = map
    // fallback if the style never finishes (blocked tiles, offline, slow CDN)
    const loadTimer = setTimeout(() => setStatus((s) => (s === 'loading' ? 'error' : s)), 10_000)
    map.on('error', (e) => {
      console.warn('[SpotMap]', (e as { error?: Error }).error?.message)
      // One-shot fallback: a non-OFM provider failed (bad key, blocked tiles) →
      // swap the style to OpenFreeMap. setStyle re-fires 'style.load', which
      // re-runs onStyleReady to rebuild the source/probe/markers on the new style.
      // Fallback applies when the live style isn't already plain OFM-custom: a
      // hosted style is active, or the provider seam is non-OFM.
      if ((ACTIVE !== 'openfreemap' || styleChoiceRef.current !== 'custom') && !triedFallback.current) {
        triedFallback.current = true
        styleChoiceRef.current = 'custom'
        map.setStyle(buildStyle(FALLBACK))
      }
    })

    // Bind to 'style.load' (not one-shot 'load') so the full source/marker setup
    // re-runs after a setStyle() fallback swap, which wipes sources/layers.
    function onStyleReady() {
      clearTimeout(loadTimer)
      setStatus('ready')
      map.resize() // container may have settled its flex height after init
      // Guard: setStyle preserves nothing, but on the first style.load the source
      // is absent; on a fallback re-fire we only re-add if it was dropped.
      if (!map.getSource(SOURCE)) {
        map.addSource(SOURCE, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterRadius: 52,
          clusterMaxZoom: 15,
        })
        // Invisible layer: MapLibre only tiles a source that at least one layer
        // references. We render pins/clusters as HTML markers (not GL layers), so
        // without this the source is never tiled and querySourceFeatures() returns
        // nothing → no markers ever. radius/opacity 0 keeps it visually inert.
        map.addLayer({
          id: `${SOURCE}-probe`,
          type: 'circle',
          source: SOURCE,
          paint: { 'circle-radius': 0, 'circle-opacity': 0 },
        })
      }
      pushData() // feed whatever items exist now (query may already be settled)
      updateMarkers()
      // Cold-load to /spot/:slug (e.g. a search-jump from another page) mounts
      // this map with focusSlug already set — the [focusSlug] effect ran before
      // the map existed and won't re-fire, so apply the initial focus here.
      const focus = focusRef.current
      const item = focus ? itemsRef.current.find((p) => p.slug === focus) : undefined
      if (item) map.flyTo({ center: [item.lng, item.lat], zoom: 15.5, duration: 700 })
    }
    map.on('style.load', onStyleReady)
    // container can mount before flex layout settles its height → keep the GL
    // canvas in sync with the host box (maplibre only auto-tracks window resize)
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(hostRef.current)

    map.on('move', updateMarkers)
    map.on('moveend', updateMarkers)
    map.on('data', (e) => {
      if ((e as { sourceId?: string }).sourceId === SOURCE && map.isSourceLoaded(SOURCE)) {
        updateMarkers()
      }
    })

    return () => {
      clearTimeout(loadTimer)
      ro.disconnect()
      markersRef.current.forEach((r) => {
        r.root.unmount()
        r.marker.remove()
      })
      markersRef.current.clear()
      onScreenRef.current.clear()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retry])

  // ── feed data into the source ────────────────────────────────────────────
  // Reads the latest items off a ref (never a stale closure) and writes them
  // to the GeoJSON source. Safe to call before the source exists — it no-ops
  // and the 'load' handler calls it again once the source is added.
  function pushData() {
    const map = mapRef.current
    const src = map?.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!src) return
    src.setData({
      type: 'FeatureCollection',
      features: itemsRef.current.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: {
          slug: p.slug,
          name: p.name,
          cat: p.category.id,
          saved: p.isSaved ? 1 : 0,
        },
      })),
    })
  }

  useEffect(() => {
    // itemsRef is already current; push if the source is ready, otherwise the
    // map 'load' handler will pick it up. No stale once('idle') closures.
    pushData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  // ── re-skin markers when selection changes ────────────────────────────────
  useEffect(() => {
    updateMarkers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug])

  // ── fly to the focused spot (detail open) + re-skin dim/enlarge ───────────
  useEffect(() => {
    updateMarkers() // refresh dim state on every focus change (set or clear)
    if (!focusSlug) return
    const map = mapRef.current
    const item = itemsRef.current.find((p) => p.slug === focusSlug)
    if (!map || !item) return
    map.flyTo({ center: [item.lng, item.lat], zoom: 15.5, duration: 700 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSlug])

  // ── marker sync: read visible features, diff against live markers ─────────
  function updateMarkers() {
    const map = mapRef.current
    if (!map || !map.getSource(SOURCE) || !map.isSourceLoaded(SOURCE)) return
    const src = map.getSource(SOURCE) as maplibregl.GeoJSONSource
    const features = map.querySourceFeatures(SOURCE)
    const next = new Set<string>()
    const sel = selectedRef.current
    const focus = focusRef.current

    for (const f of features) {
      const props = f.properties ?? {}
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]

      if (props.cluster) {
        const id = `c${props.cluster_id}`
        const count = props.point_count as number
        next.add(id)
        let rec = markersRef.current.get(id)
        if (!rec) {
          const el = document.createElement('div')
          el.style.cursor = 'pointer'
          el.addEventListener('click', () => {
            src.getClusterExpansionZoom(props.cluster_id as number).then((zoom) => {
              map.easeTo({ center: coords, zoom: Math.min(zoom + 0.4, 17), duration: 480 })
            })
          })
          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat(coords)
            .addTo(map)
          rec = { marker, root: createRoot(el), key: '' }
          markersRef.current.set(id, rec)
        }
        // dots + active flag need cluster leaves (async)
        renderCluster(rec, src, props.cluster_id as number, count, sel)
      } else {
        const slug = String(props.slug)
        const id = `p${slug}`
        next.add(id)
        const selected = sel === slug
        const saved = props.saved === 1 || props.saved === true
        const dim = !!focus && focus !== slug
        const key = `${selected}|${saved}|${dim}`
        let rec = markersRef.current.get(id)
        if (!rec) {
          const el = document.createElement('div')
          el.addEventListener('click', () => {
            track('pin', undefined, slug)
            onSelectRef.current?.(slug)
          })
          const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat(coords)
            .addTo(map)
          rec = { marker, root: createRoot(el), key: '' }
          markersRef.current.set(id, rec)
        }
        if (rec.key !== key) {
          rec.key = key
          rec.root.render(
            <SpotPin cat={props.cat as CategoryId} name={String(props.name)} selected={selected} saved={saved} dim={dim} />,
          )
        }
      }
    }

    // drop markers that scrolled/zoomed out of the current feature set
    markersRef.current.forEach((rec, id) => {
      if (!next.has(id)) {
        rec.root.unmount()
        rec.marker.remove()
        markersRef.current.delete(id)
      }
    })
    onScreenRef.current = next
  }

  function renderCluster(
    rec: MarkerRec,
    src: maplibregl.GeoJSONSource,
    clusterId: number,
    count: number,
    sel: string | null | undefined,
  ) {
    const focus = focusRef.current
    src.getClusterLeaves(clusterId, Infinity, 0).then((leaves) => {
      const cats: CategoryId[] = []
      let active = false
      let hasFocus = false
      for (const l of leaves) {
        const p = l.properties ?? {}
        if (!cats.includes(p.cat as CategoryId)) cats.push(p.cat as CategoryId)
        if (sel && p.slug === sel) active = true
        if (focus && p.slug === focus) hasFocus = true
      }
      const dim = !!focus && !hasFocus
      const key = `${count}|${active}|${dim}|${cats.slice(0, 3).join(',')}`
      if (rec.key === key) return
      rec.key = key
      rec.root.render(<ClusterPill count={count} dots={cats} active={active} dim={dim} />)
    })
  }

  // ── runtime basemap swap ──────────────────────────────────────────────────
  // setStyle wipes GL sources/layers; the 'style.load' handler (onStyleReady)
  // re-adds the spots source/probe and rebuilds markers. Reset triedFallback so
  // the one-shot error→OFM fallback still arms for the newly-chosen style.
  function chooseStyle(c: StyleChoice) {
    if (c === styleChoice) return
    const map = mapRef.current
    if (!map) return
    setStyleChoice(c)
    styleChoiceRef.current = c
    saveStyleChoice(c)
    triedFallback.current = false
    map.setStyle(styleForChoice(c))
  }

  return (
    <div className="fg-mapcanvas">
      <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
      {status !== 'error' && (
        <div className="fg-styleswitch" role="group" aria-label="Basemap style">
          {STYLE_OPTIONS.map((o) => {
            const disabled = o.hosted && !hasMaptilerKey
            return (
              <button
                key={o.id}
                type="button"
                data-on={styleChoice === o.id}
                disabled={disabled}
                aria-pressed={styleChoice === o.id}
                title={disabled ? 'Needs a MapTiler key' : undefined}
                onClick={() => chooseStyle(o.id)}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )}
      {status === 'error' && (
        <div className="fg-maperr">
          <div className="fg-maperr-box">
            <strong>Map couldn't load</strong>
            <span>Check your connection — the spot list still works below.</span>
            <button className="fg-btn" onClick={() => setRetry((n) => n + 1)}>Retry</button>
          </div>
        </div>
      )}
    </div>
  )
}
