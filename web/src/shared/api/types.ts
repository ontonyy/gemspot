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

/* A curated collection of spots. MVP = derived from existing places
   (by category / by a cross-cut like "free to play"). No CMS. */
export interface GuideDto {
  id: string
  title: string
  subtitle: string
  coverCategory: CategoryId // drives accent + glyph
  count: number
  spotSlugs: string[]
}

/* A user-added spot pending moderation. Never instantly live:
   PENDING → admin approves → becomes a Place. Mirrors the backend Submission. */
export interface SubmissionInput {
  name: string
  categoryId: CategoryId
  lat: number
  lng: number
  note: string
  photoCount?: number
}

export interface SubmissionDto extends SubmissionInput {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  submittedAt: string // human-relative for mock ("just now")
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
