/* GuideRouteMap — light non-interactive mini-map for a guide detail page.
   A guide is a route: markers are numbered in the guide's curated order.
   Always uses the fg monochrome palette (local style object, no provider key,
   no switcher/clustering — that stays in SpotMap). Clicking a numbered pin
   opens the spot; the viewport itself is locked. */

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { catColor, type CategoryId } from '../../entities/place/categories'
import { buildStyle } from './buildStyle'

export interface GuideRouteMapSpot {
  slug: string
  name: string
  lat: number
  lng: number
  category: { id: CategoryId }
}

interface GuideRouteMapProps {
  spots: GuideRouteMapSpot[]
  onOpen?: (slug: string) => void
}

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

export function GuideRouteMap({ spots, onOpen }: GuideRouteMapProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const onOpenRef = useRef<typeof onOpen>(onOpen)
  useEffect(() => { onOpenRef.current = onOpen }, [onOpen])

  useEffect(() => {
    const host = hostRef.current
    if (!host || spots.length === 0 || !webglAvailable()) return

    const bounds = new maplibregl.LngLatBounds()
    spots.forEach((s) => bounds.extend([s.lng, s.lat]))

    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: host,
        style: buildStyle(),
        bounds,
        fitBoundsOptions: { padding: 48, maxZoom: 15 },
        interactive: false,
        attributionControl: { compact: true },
      })
    } catch (err) {
      console.warn('[GuideRouteMap] init failed', err)
      return
    }
    // container height settles after flex layout → keep canvas in sync
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(host)

    const markers = spots.map((s, i) => {
      const el = document.createElement('div')
      el.className = 'fg-minipin'
      el.style.setProperty('--pc', catColor(s.category.id))
      el.title = s.name
      el.textContent = String(i + 1)
      el.addEventListener('click', () => onOpenRef.current?.(s.slug))
      return new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([s.lng, s.lat]).addTo(map)
    })

    return () => {
      ro.disconnect()
      markers.forEach((m) => m.remove())
      map.remove()
    }
    // spots identity changes only when the guide/list resolves — safe dep
  }, [spots])

  if (spots.length === 0) return null
  return (
    <div className="fg-guidemap" aria-label="Route map">
      <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
    </div>
  )
}
