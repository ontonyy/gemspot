/* DTO contract — the stable shapes React codes against, mirrored from
   design_handoff_field_guide/docs/05. Backend (Node/Prisma, later session)
   serves these; the mock placesApi returns the same shapes today.
   No `rating` field anywhere — social proof = savesCount + distanceKm. */

import type { CategoryId } from '../../entities/place/categories'

export interface CategoryDto {
  id: CategoryId
  label: string
  short: string
  color: string // hex/css color driving marker + badge
  glyph: string // glyph key
}

export interface PlaceCardDto {
  id: string
  slug: string
  name: string
  category: CategoryDto
  neighborhood: string
  distanceKm?: number // computed client-side from active origin
  savesCount: number
  isFree: boolean
  thumbUrl?: string
  tags: string[]
  isSaved?: boolean
  lat: number
  lng: number
}

export interface PlaceDetailDto extends PlaceCardDto {
  note: string
  photos: { url: string }[]
  viewsCount: number
  sharesCount: number
  contributor: { name: string }
  verifiedAt?: string
  // 3-cell Field notes table on the detail panel
  fieldNotes: { access: string; lit: string; best: string }
  appleMapsUrl: string
  googleMapsUrl: string
}
