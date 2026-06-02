/* Client-side geo math. No backend yet — distances computed in the browser
   against mock coords (CONTEXT.md Geolocation decision). */

export interface LatLng {
  lat: number
  lng: number
}

/** Tallinn city center — fake origin used when geolocation denied/unavailable. */
export const TALLINN_CENTER: LatLng = { lat: 59.437, lng: 24.745 }

/** Spots farther than this from the active origin are "out of region". */
export const OUT_OF_REGION_KM = 30

const R_EARTH_KM = 6371
const toRad = (deg: number): number => (deg * Math.PI) / 180

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R_EARTH_KM * Math.asin(Math.sqrt(h))
}

/** Round to one decimal for card display ("0.4 km"). */
export const roundKm = (km: number): number => Math.round(km * 10) / 10
