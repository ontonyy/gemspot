/* SpotMap — MapLibre GL + OpenFreeMap basemap, bounded to Tallinn, with
   branded HTML markers (fg disc + glyph + ink stem, 4 states) and native
   GeoJSON clustering rendered as fg count-pills.

   Marker strategy (CONTEXT decision): GeoJSON source `cluster:true` does the
   grouping + cluster-expansion-zoom; we render every visible feature as an
   `maplibregl.Marker` HTML overlay (pixel-perfect fg pin / cluster pill) by
   reading `querySourceFeatures` on each render. React roots are cached per
   marker id and only re-rendered when their visual state key changes. */

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { createRoot, type Root } from 'react-dom/client'
import { CategoryGlyph, catColor, type CategoryId } from '../../entities/place/categories'
import { TALLINN_CENTER } from '../../shared/lib/geo'

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
}: {
  cat: CategoryId
  name: string
  selected: boolean
  saved: boolean
}) {
  return (
    <div
      className="fg-pin"
      data-sel={selected}
      data-saved={saved}
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
}: {
  count: number
  dots: CategoryId[]
  active: boolean
}) {
  return (
    <div className="fg-cluster" data-active={active}>
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

export function SpotMap({ items, selectedSlug, onSelect }: SpotMapProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<Map<string, MarkerRec>>(new Map())
  const onScreenRef = useRef<Set<string>>(new Set())
  // latest props read inside event handlers without re-binding listeners
  const selectedRef = useRef<string | null | undefined>(selectedSlug)
  const onSelectRef = useRef<typeof onSelect>(onSelect)
  selectedRef.current = selectedSlug
  onSelectRef.current = onSelect

  // ── init map once ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!hostRef.current) return
    const map = new maplibregl.Map({
      container: hostRef.current,
      style: '/map-style.json',
      center: CENTER,
      zoom: 12.4,
      minZoom: 10,
      maxZoom: 18,
      maxBounds: MAX_BOUNDS,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    map.on('error', (e) => console.warn('[SpotMap]', (e as { error?: Error }).error?.message))

    map.on('load', () => {
      map.addSource(SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: 52,
        clusterMaxZoom: 15,
      })
      updateMarkers()
    })
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
  }, [])

  // ── feed data into the source ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      const src = map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined
      if (!src) return
      src.setData({
        type: 'FeatureCollection',
        features: items.map((p) => ({
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
    if (map.isStyleLoaded() && map.getSource(SOURCE)) apply()
    else map.once('idle', apply)
  }, [items])

  // ── re-skin markers when selection changes ────────────────────────────────
  useEffect(() => {
    updateMarkers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug])

  // ── marker sync: read visible features, diff against live markers ─────────
  function updateMarkers() {
    const map = mapRef.current
    if (!map || !map.getSource(SOURCE) || !map.isSourceLoaded(SOURCE)) return
    const src = map.getSource(SOURCE) as maplibregl.GeoJSONSource
    const features = map.querySourceFeatures(SOURCE)
    const next = new Set<string>()
    const sel = selectedRef.current

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
        const key = `${selected}|${saved}`
        let rec = markersRef.current.get(id)
        if (!rec) {
          const el = document.createElement('div')
          el.addEventListener('click', () => onSelectRef.current?.(slug))
          const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat(coords)
            .addTo(map)
          rec = { marker, root: createRoot(el), key: '' }
          markersRef.current.set(id, rec)
        }
        if (rec.key !== key) {
          rec.key = key
          rec.root.render(
            <SpotPin cat={props.cat as CategoryId} name={String(props.name)} selected={selected} saved={saved} />,
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
    src.getClusterLeaves(clusterId, Infinity, 0).then((leaves) => {
      const cats: CategoryId[] = []
      let active = false
      for (const l of leaves) {
        const p = l.properties ?? {}
        if (!cats.includes(p.cat as CategoryId)) cats.push(p.cat as CategoryId)
        if (sel && p.slug === sel) active = true
      }
      const key = `${count}|${active}|${cats.slice(0, 3).join(',')}`
      if (rec.key === key) return
      rec.key = key
      rec.root.render(<ClusterPill count={count} dots={cats} active={active} />)
    })
  }

  return <div ref={hostRef} className="fg-mapcanvas" />
}
