import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Icon, Ic } from '../../shared/ui/Icon'
import type { LatLng } from '../../shared/lib/geo'

/* Map location picker for Add-a-spot. Fixed crosshair pin at map center;
   the picked coords = map center, reported on every moveend. Reuses the
   vendored fg basemap style, bounded to Tallinn (same frame as SpotMap). */
const STYLE = `${import.meta.env.BASE_URL}map-style.json`
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
      style: STYLE,
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
    </div>
  )
}
