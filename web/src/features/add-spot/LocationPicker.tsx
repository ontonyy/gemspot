import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Icon, Ic } from '../../shared/ui/Icon'
import type { LatLng } from '../../shared/lib/geo'
import { buildStyle } from '../../widgets/map/buildStyle'
import { provider } from '../../widgets/map/provider'
import { useGeoStore } from '../../shared/store/geoStore'

/* Map location picker for Add-a-spot. Fixed crosshair pin at map center;
   the picked coords = map center, reported on every moveend. Uses the shared
   provider style seam, bounded to Tallinn (same frame as SpotMap). Zoom
   controls + "use my location" (via geoStore) help pick a precise point;
   cooperative gestures on touch keep page scroll from being hijacked. */
const MAX_BOUNDS: maplibregl.LngLatBoundsLike = [[24.55, 59.36], [24.95, 59.5]]

// Touch devices: require two-finger pan / pinch so a one-finger drag scrolls the
// page instead of the map (MapLibre shows a hint overlay when this is on).
const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

export function LocationPicker({ value, onChange }: { value: LatLng; onChange: (c: LatLng) => void }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const [picked, setPicked] = useState<LatLng>(value)
  const geoStatus = useGeoStore((s) => s.status)
  const geoOrigin = useGeoStore((s) => s.origin)
  const geoRequest = useGeoStore((s) => s.request)
  // only recenter after the user asks — not on the curated Tallinn default
  const awaitingFix = useRef(false)

  useEffect(() => {
    if (!hostRef.current) return
    const map = new maplibregl.Map({
      container: hostRef.current,
      style: buildStyle(),
      center: [value.lng, value.lat],
      zoom: 13,
      minZoom: 10,
      maxBounds: MAX_BOUNDS,
      attributionControl: false,
      cooperativeGestures: isTouch,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    const report = () => {
      const c = map.getCenter()
      const next = { lat: +c.lat.toFixed(6), lng: +c.lng.toFixed(6) }
      setPicked(next)
      onChangeRef.current(next)
    }
    map.on('moveend', report)
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(hostRef.current)
    return () => { ro.disconnect(); map.remove(); mapRef.current = null }
    // mount once — value is the initial center only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // when a real fix lands after the user pressed "use my location", fly there
  useEffect(() => {
    if (!awaitingFix.current || geoStatus !== 'real') return
    awaitingFix.current = false
    mapRef.current?.flyTo({ center: [geoOrigin.lng, geoOrigin.lat], zoom: 15 })
  }, [geoStatus, geoOrigin])

  const useMyLocation = () => {
    awaitingFix.current = true
    geoRequest()
  }

  return (
    <div className="fg-pickmap">
      <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
      <span className="fg-pick-pin"><Icon d={Ic.pin} size={30} sw={2} /></span>

      <button
        type="button"
        className="fg-pick-locate"
        onClick={useMyLocation}
        disabled={geoStatus === 'locating'}
        aria-label="Use my location"
      >
        <Icon d={Ic.pin} size={13} sw={2} />
        <span>{geoStatus === 'locating' ? 'Locating…' : 'My location'}</span>
      </button>

      <span className="fg-pick-hint">Drag the map — the pin marks the exact spot</span>
      <span className="fg-pick-coords mono">{picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}</span>

      {/* attributionControl is off on this mini-map, but provider ToS (MapTiler/
          OSM) still requires visible credit — static caption covers it. */}
      <span
        className="fg-pick-attrib"
        style={{
          position: 'absolute',
          right: 4,
          bottom: 2,
          fontSize: 9,
          lineHeight: 1.3,
          padding: '0 4px',
          borderRadius: 3,
          background: 'rgba(255,255,255,0.7)',
          color: '#333',
          pointerEvents: 'none',
        }}
        dangerouslySetInnerHTML={{ __html: provider.attribution }}
      />
    </div>
  )
}
