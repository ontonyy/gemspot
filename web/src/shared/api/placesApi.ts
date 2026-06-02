/* Mock placesApi seam. Returns view-ready DTOs (types.ts) behind an interface
   so a real Spring/Node client can swap in later with no call-site changes.
   Dataset ported from fg-data.jsx FG_PLACES + real-ish Tallinn lat/lng, with
   2 entries on the new tennis/padel categories to exercise the 7-cat taxonomy. */

import { FG_CAT } from '../../entities/place/categories'
import type { CategoryId } from '../../entities/place/categories'
import type { CategoryDto, PlaceCardDto, PlaceDetailDto } from './types'

interface RawPlace {
  id: string
  slug: string
  name: string
  cat: CategoryId
  area: string
  lat: number
  lng: number
  x: number // map-canvas % (fg prototype) — kept for non-geo fallback
  y: number
  saves: number
  views: number
  shares: number
  tags: string[]
  note: string
  by: string
  verified: string // human-relative for mock ("12 days ago")
  isFree: boolean
  access: string // Field-notes cell: Free / Paid / Booking
  lit: string // Field-notes cell: Yes / No
  best: string // Field-notes cell: best time to visit
}

const RAW: RawPlace[] = [
  { id: '01', slug: 'politseiaia-ping-pong', name: 'Politseiaia ping-pong', cat: 'tabletennis', area: 'Kesklinn', lat: 59.4351, lng: 24.7475, x: 38, y: 54, saves: 38, views: 412, shares: 9, tags: ['Free', 'Concrete', 'Lit'], note: 'Two weather-worn outdoor tables tucked behind the police garden. Quiet on weekday mornings, busy after 18:00 when the after-work crowd rolls in.', by: 'maris_t', verified: '12 days ago', isFree: true, access: 'Free', lit: 'Yes', best: 'Eve' },
  { id: '02', slug: 'kanuti-aed-blossoms', name: 'Kanuti aed blossoms', cat: 'sakura', area: 'Kesklinn', lat: 59.4405, lng: 24.7495, x: 52, y: 38, saves: 96, views: 1203, shares: 41, tags: ['Seasonal', 'Late Apr'], note: 'A short row of cherry trees along the old bastion wall. Peak bloom lasts roughly ten days; go early to beat the photographers.', by: 'tallinn_walks', verified: '4 days ago', isFree: true, access: 'Free', lit: 'No', best: 'Apr' },
  { id: '03', slug: 'patkuli-viewpoint', name: 'Patkuli viewpoint', cat: 'scenic', area: 'Toompea', lat: 59.4395, lng: 24.7385, x: 30, y: 30, saves: 142, views: 2890, shares: 88, tags: ['Free', 'Sunset', 'Rooftops'], note: 'The classic red-roof panorama over the lower town and harbour. North-facing, so best at golden hour rather than true sunset.', by: 'gemspot_team', verified: '2 days ago', isFree: true, access: 'Free', lit: 'No', best: 'Dusk' },
  { id: '04', slug: 'politseipark-hoops', name: 'Politseipark hoops', cat: 'basketball', area: 'Kesklinn', lat: 59.4330, lng: 24.7480, x: 46, y: 62, saves: 21, views: 198, shares: 4, tags: ['Free', 'Full court'], note: 'Single full court with fresh nets as of this spring. Surface drains well, so it dries fast after rain.', by: 'hoops_ee', verified: '9 days ago', isFree: true, access: 'Free', lit: 'Yes', best: 'Day' },
  { id: '05', slug: 'kadrioru-tennis-courts', name: 'Kadrioru tennis courts', cat: 'tennis', area: 'Kadriorg', lat: 59.4380, lng: 24.7905, x: 72, y: 34, saves: 44, views: 530, shares: 12, tags: ['Hard court', 'Lit'], note: 'Public hard courts beside the park. First-come on weekdays; bring your own net tension tolerance and a spare ball.', by: 'noor.k', verified: '6 days ago', isFree: false, access: 'Paid', lit: 'Yes', best: 'Day' },
  { id: '06', slug: 'lowenruh-pitch', name: 'Löwenruh pitch', cat: 'football', area: 'Kristiine', lat: 59.4270, lng: 24.7180, x: 70, y: 70, saves: 34, views: 305, shares: 7, tags: ['Free', 'Grass'], note: 'Full-size grass pitch beside the park pond. Open for pickup games when the clubs are not training.', by: 'fc_local', verified: '15 days ago', isFree: true, access: 'Free', lit: 'No', best: 'Eve' },
  { id: '07', slug: 'snelli-pond-tables', name: 'Snelli pond tables', cat: 'tabletennis', area: 'Kesklinn', lat: 59.4375, lng: 24.7430, x: 44, y: 44, saves: 52, views: 644, shares: 15, tags: ['Free', 'Shaded'], note: 'Three tables under the trees by Snelli pond. Shaded all afternoon, which makes it the summer favourite.', by: 'maris_t', verified: '3 days ago', isFree: true, access: 'Free', lit: 'No', best: 'Day' },
  { id: '08', slug: 'pirita-padel-club', name: 'Pirita padel club', cat: 'padel', area: 'Pirita', lat: 59.4690, lng: 24.8330, x: 88, y: 18, saves: 27, views: 281, shares: 6, tags: ['Booking', 'Indoor'], note: 'Four indoor padel courts out by the marina. Book ahead on weekends; off-peak weekday slots are easy to grab.', by: 'fc_local', verified: '8 days ago', isFree: false, access: 'Booking', lit: 'Yes', best: 'Eve' },
  { id: '09', slug: 'lasnamae-cliff-view', name: 'Lasnamäe cliff view', cat: 'scenic', area: 'Lasnamäe', lat: 59.4360, lng: 24.8400, x: 86, y: 40, saves: 67, views: 910, shares: 22, tags: ['Free', 'Industrial'], note: 'Limestone escarpment looking back at the city skyline. Raw, a little industrial, and almost always empty.', by: 'noor.k', verified: '11 days ago', isFree: true, access: 'Free', lit: 'No', best: 'Dusk' },
  { id: '10', slug: 'tammsaare-cherries', name: 'Tammsaare cherries', cat: 'sakura', area: 'Kesklinn', lat: 59.4330, lng: 24.7530, x: 56, y: 56, saves: 113, views: 1740, shares: 53, tags: ['Seasonal', 'Late Apr', 'Central'], note: 'The most photographed blossoms in town, ringing the park fountain. Crowded at peak, but worth one early visit.', by: 'tallinn_walks', verified: '5 days ago', isFree: true, access: 'Free', lit: 'No', best: 'Apr' },
]

function toCategoryDto(cat: CategoryId): CategoryDto {
  const c = FG_CAT[cat]
  return { id: c.id, label: c.label, short: c.short, color: c.cssvar, glyph: c.id }
}

function toCard(r: RawPlace): PlaceCardDto {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: toCategoryDto(r.cat),
    neighborhood: r.area,
    savesCount: r.saves,
    isFree: r.isFree,
    tags: r.tags,
    lat: r.lat,
    lng: r.lng,
  }
}

function toDetail(r: RawPlace): PlaceDetailDto {
  const q = `${r.lat},${r.lng}`
  return {
    ...toCard(r),
    note: r.note,
    photos: [{ url: '' }],
    viewsCount: r.views,
    sharesCount: r.shares,
    contributor: { name: r.by },
    verifiedAt: r.verified,
    fieldNotes: { access: r.access, lit: r.lit, best: r.best },
    appleMapsUrl: `https://maps.apple.com/?ll=${q}&q=${encodeURIComponent(r.name)}`,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${q}`,
  }
}

/** Contract a real backend client implements later (Node/Spring REST). */
export interface PlacesApi {
  getPlaces(params?: { cat?: CategoryId }): Promise<PlaceCardDto[]>
  getPlace(slug: string): Promise<PlaceDetailDto>
  getCategories(): Promise<CategoryDto[]>
}

// simulate network latency so loading states are observable in dev
const delay = <T>(value: T, ms = 180): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms))

export const mockPlacesApi: PlacesApi = {
  getPlaces(params) {
    const rows = params?.cat ? RAW.filter((r) => r.cat === params.cat) : RAW
    return delay(rows.map(toCard))
  },
  getPlace(slug) {
    const r = RAW.find((x) => x.slug === slug)
    if (!r) return Promise.reject(new Error(`place not found: ${slug}`))
    return delay(toDetail(r))
  },
  getCategories() {
    return delay(Object.values(FG_CAT).map((c) => toCategoryDto(c.id)))
  },
}

/** Swap point: later `export const placesApi = httpPlacesApi`. */
export const placesApi: PlacesApi = mockPlacesApi
