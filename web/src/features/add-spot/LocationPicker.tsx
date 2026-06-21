import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Icon, Ic } from '../../shared/ui/Icon'
import type { LatLng } from '../../shared/lib/geo'
import { buildStyle } from '../../widgets/map/buildStyle'
import { provider } from '../../widgets/map/provider'

/* Map location picker for Add-a-spot. Fixed crosshair pin at map center;
   the picked coords = map center, reported on every moveend. Uses the shared
   provider style seam, bounded to Tallinn (same frame as SpotMap). */
const MAX_BOUNDS: maplibregl.LngLatBoundsLike = [[24.55, 59.36], [24.95, 59.5]]

export function LocationPicker({ value, onChange }: { value: LatLng; onChange: (c: LatLng) => void }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

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
    })
    mapRef.current = map
    const report = () => {
      const c = map.getCenter()
      onChangeRef.current({ lat: +c.lat.toFixed(6), lng: +c.lng.toFixed(6) })
    }
    map.on('moveend', report)
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(hostRef.current)
    return () => { ro.disconnect(); map.remove(); mapRef.current = null }
    // mount once — value is the initial center only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fg-pickmap">
      <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
      <span className="fg-pick-pin"><Icon d={Ic.pin} size={30} sw={2} /></span>
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
