/* DTO shapes — MUST stay byte-identical to web/src/shared/api/types.ts.
   No `rating` anywhere. Optional fields (distanceKm, thumbUrl, isSaved) are
   omitted from JSON when absent, exactly like the mock. */

export type CategoryId =
  | 'tabletennis' | 'basketball' | 'football'
  | 'tennis' | 'padel' | 'scenic' | 'sakura'

export interface CategoryDto {
  id: CategoryId
  label: string
  short: string
  color: string // cssvar string driving marker + badge (e.g. "--c-tabletennis")
  glyph: string // glyph key (= category id)
}

export interface PlaceCardDto {
  id: string
  slug: string
  name: string
  category: CategoryDto
  neighborhood: string
  distanceKm?: number
  savesCount: number
  isFree: boolean
  thumbUrl?: string
  tags: string[]
  isSaved?: boolean
  lat: number
  lng: number
}

export interface GuideDto {
  id: string
  title: string
  subtitle: string
  coverCategory: CategoryId
  count: number
  spotSlugs: string[]
}

export interface PlaceDetailDto extends PlaceCardDto {
  note: string
  photos: { url: string }[]
  viewsCount: number
  sharesCount: number
  contributor: { name: string }
  verifiedAt?: string
  fieldNotes: { access: string; lit: string; best: string }
  appleMapsUrl: string
  googleMapsUrl: string
}
