/* Geolocation state. Real browser Geolocation + Permissions API; on
   denied/unavailable we fall back to Tallinn center and flag "location off →
   curated" (CONTEXT.md decision). Distance math lives in shared/lib/geo. */

import { create } from 'zustand'
import { TALLINN_CENTER } from '../lib/geo'
import type { LatLng } from '../lib/geo'

/** idle: not asked · locating: awaiting fix · real: live GPS origin ·
    curated: denied/unavailable, using Tallinn center. */
export type GeoStatus = 'idle' | 'locating' | 'real' | 'curated'

interface GeoState {
  status: GeoStatus
  origin: LatLng // always usable; Tallinn center until/unless a real fix lands
  /** true when origin is the curated fallback, not the user's real position. */
  isCurated: boolean
  permission: PermissionState | 'unsupported' | 'unknown'
  request: () => void
}

function geoUnsupported(): boolean {
  return typeof navigator === 'undefined' || !('geolocation' in navigator)
}

export const useGeoStore = create<GeoState>((set, get) => ({
  status: 'idle',
  origin: TALLINN_CENTER,
  isCurated: true,
  permission: 'unknown',

  request: () => {
    if (get().status === 'locating') return

    if (geoUnsupported()) {
      set({ status: 'curated', isCurated: true, origin: TALLINN_CENTER, permission: 'unsupported' })
      return
    }

    set({ status: 'locating' })

    // best-effort permission read (not all browsers expose it)
    navigator.permissions
      ?.query({ name: 'geolocation' as PermissionName })
      .then((p) => set({ permission: p.state }))
      .catch(() => {})

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        set({
          status: 'real',
          isCurated: false,
          origin: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        }),
      () =>
        // denied / position-unavailable / timeout → curated fallback
        set({ status: 'curated', isCurated: true, origin: TALLINN_CENTER }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    )
  },
}))
