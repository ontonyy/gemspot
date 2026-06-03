/* Derived Explore list: fetch cards → annotate distanceKm + isSaved + region
   flag from active geo origin → filter(category + text query) → sort by
   distance. Single source of the rail/map list. */

import { useMemo } from 'react'
import type { CategoryId } from '../../entities/place/categories'
import { usePlaces } from '../../shared/api/queries'
import type { PlaceCardDto } from '../../shared/api/types'
import { haversineKm, roundKm, OUT_OF_REGION_KM } from '../../shared/lib/geo'
import { useGeoStore } from '../../shared/store/geoStore'
import { useSavedStore } from '../../shared/store/savedStore'

export interface ExploreCard extends PlaceCardDto {
  distanceKm: number
  isSaved: boolean
  outOfRegion: boolean
}

export interface ExploreFilters {
  cat?: CategoryId | null
  query?: string
  free?: boolean
}

export function useExploreList(filters: ExploreFilters = {}) {
  const cat = filters.cat ?? null
  const query = (filters.query ?? '').trim().toLowerCase()
  const free = filters.free ?? false

  const places = usePlaces(cat ?? undefined)
  const origin = useGeoStore((s) => s.origin)
  const savedIds = useSavedStore((s) => s.ids)

  const items = useMemo<ExploreCard[]>(() => {
    const rows = places.data ?? []
    return rows
      .map((p) => {
        const km = roundKm(haversineKm(origin, { lat: p.lat, lng: p.lng }))
        return {
          ...p,
          distanceKm: km,
          isSaved: savedIds.includes(p.id),
          outOfRegion: km > OUT_OF_REGION_KM,
        }
      })
      .filter((p) => (cat ? p.category.id === cat : true))
      .filter((p) => (free ? p.isFree : true))
      .filter((p) =>
        query
          ? p.name.toLowerCase().includes(query) ||
            p.neighborhood.toLowerCase().includes(query) ||
            p.tags.some((t) => t.toLowerCase().includes(query))
          : true,
      )
      .sort((a, b) => a.distanceKm - b.distanceKm)
  }, [places.data, origin, savedIds, cat, query, free])

  return { ...places, items }
}
