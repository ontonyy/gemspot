/* Mock placesApi seam. Returns view-ready DTOs (types.ts) behind an interface
   so a real Spring/Node client can swap in later with no call-site changes.
   Dataset ported from fg-data.jsx FG_PLACES + real-ish Tallinn lat/lng, with
   2 entries on the new tennis/padel categories to exercise the 7-cat taxonomy. */

import { FG_CAT } from '../../entities/place/categories'
import type { CategoryId } from '../../entities/place/categories'
import type { CategoryDto, GuideDto, PlaceCardDto, PlaceDetailDto, ReportDto, ReportInput, SubmissionDto, SubmissionInput } from './types'
import { FG_CATS } from '../../entities/place/categories'

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
  verified?: string // ISO 8601 verification timestamp; omit = unverified (no badge)
  isFree: boolean
  access: string // Field-notes cell: Free / Paid / Booking
  lit: string // Field-notes cell: Yes / No
  best: string // Field-notes cell: best time to visit
}

const RAW: RawPlace[] = [
  { id: '01', slug: 'politseiaia-ping-pong', name: 'Politseiaia ping-pong', cat: 'tabletennis', area: 'Kesklinn', lat: 59.4351, lng: 24.7475, x: 38, y: 54, saves: 38, views: 412, shares: 9, tags: ['Free', 'Concrete', 'Lit'], note: 'Two weather-worn outdoor tables tucked behind the police garden. Quiet on weekday mornings, busy after 18:00 when the after-work crowd rolls in.', by: 'maris_t', verified: '2026-05-27T09:00:00Z', isFree: true, access: 'Free', lit: 'Yes', best: 'Eve' },
  { id: '02', slug: 'kanuti-aed-blossoms', name: 'Kanuti aed blossoms', cat: 'sakura', area: 'Kesklinn', lat: 59.4405, lng: 24.7495, x: 52, y: 38, saves: 96, views: 1203, shares: 41, tags: ['Seasonal', 'Late Apr'], note: 'A short row of cherry trees along the old bastion wall. Peak bloom lasts roughly ten days; go early to beat the photographers.', by: 'tallinn_walks', verified: '2026-06-04T09:00:00Z', isFree: true, access: 'Free', lit: 'No', best: 'Apr' },
  { id: '03', slug: 'patkuli-viewpoint', name: 'Patkuli viewpoint', cat: 'scenic', area: 'Toompea', lat: 59.4395, lng: 24.7385, x: 30, y: 30, saves: 142, views: 2890, shares: 88, tags: ['Free', 'Sunset', 'Rooftops'], note: 'The classic red-roof panorama over the lower town and harbour. North-facing, so best at golden hour rather than true sunset.', by: 'gemspot_team', verified: '2026-06-06T09:00:00Z', isFree: true, access: 'Free', lit: 'No', best: 'Dusk' },
  { id: '04', slug: 'politseipark-hoops', name: 'Politseipark hoops', cat: 'basketball', area: 'Kesklinn', lat: 59.4330, lng: 24.7480, x: 46, y: 62, saves: 21, views: 198, shares: 4, tags: ['Free', 'Full court'], note: 'Single full court with fresh nets as of this spring. Surface drains well, so it dries fast after rain.', by: 'hoops_ee', verified: '2026-05-30T09:00:00Z', isFree: true, access: 'Free', lit: 'Yes', best: 'Day' },
  { id: '05', slug: 'kadrioru-tennis-courts', name: 'Kadrioru tennis courts', cat: 'tennis', area: 'Kadriorg', lat: 59.4380, lng: 24.7905, x: 72, y: 34, saves: 44, views: 530, shares: 12, tags: ['Hard court', 'Lit'], note: 'Public hard courts beside the park. First-come on weekdays; bring your own net tension tolerance and a spare ball.', by: 'noor.k', verified: '2026-06-02T09:00:00Z', isFree: false, access: 'Paid', lit: 'Yes', best: 'Day' },
  { id: '06', slug: 'lowenruh-pitch', name: 'Löwenruh pitch', cat: 'football', area: 'Kristiine', lat: 59.4270, lng: 24.7180, x: 70, y: 70, saves: 34, views: 305, shares: 7, tags: ['Free', 'Grass'], note: 'Full-size grass pitch beside the park pond. Open for pickup games when the clubs are not training.', by: 'fc_local', isFree: true, access: 'Free', lit: 'No', best: 'Eve' },
  { id: '07', slug: 'snelli-pond-tables', name: 'Snelli pond tables', cat: 'tabletennis', area: 'Kesklinn', lat: 59.4375, lng: 24.7430, x: 44, y: 44, saves: 52, views: 644, shares: 15, tags: ['Free', 'Shaded'], note: 'Three tables under the trees by Snelli pond. Shaded all afternoon, which makes it the summer favourite.', by: 'maris_t', verified: '2026-06-05T09:00:00Z', isFree: true, access: 'Free', lit: 'No', best: 'Day' },
  { id: '08', slug: 'pirita-padel-club', name: 'Pirita padel club', cat: 'padel', area: 'Pirita', lat: 59.4690, lng: 24.8330, x: 88, y: 18, saves: 27, views: 281, shares: 6, tags: ['Booking', 'Indoor'], note: 'Four indoor padel courts out by the marina. Book ahead on weekends; off-peak weekday slots are easy to grab.', by: 'fc_local', isFree: false, access: 'Booking', lit: 'Yes', best: 'Eve' },
  { id: '09', slug: 'lasnamae-cliff-view', name: 'Lasnamäe cliff view', cat: 'scenic', area: 'Lasnamäe', lat: 59.4360, lng: 24.8400, x: 86, y: 40, saves: 67, views: 910, shares: 22, tags: ['Free', 'Industrial'], note: 'Limestone escarpment looking back at the city skyline. Raw, a little industrial, and almost always empty.', by: 'noor.k', verified: '2026-05-28T09:00:00Z', isFree: true, access: 'Free', lit: 'No', best: 'Dusk' },
  { id: '10', slug: 'tammsaare-cherries', name: 'Tammsaare cherries', cat: 'sakura', area: 'Kesklinn', lat: 59.4330, lng: 24.7530, x: 56, y: 56, saves: 113, views: 1740, shares: 53, tags: ['Seasonal', 'Late Apr', 'Central'], note: 'The most photographed blossoms in town, ringing the park fountain. Crowded at peak, but worth one early visit.', by: 'tallinn_walks', verified: '2026-06-03T09:00:00Z', isFree: true, access: 'Free', lit: 'No', best: 'Apr' },
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

/* Guides = curated collections derived from the place set (no CMS). One guide
   per category that has ≥2 spots, plus a "Free to play" cross-cut. */
const FREE_GUIDE_ID = 'free-to-play'

function buildGuides(): GuideDto[] {
  const byCat: GuideDto[] = FG_CATS.map((c) => {
    const slugs = RAW.filter((r) => r.cat === c.id).map((r) => r.slug)
    return {
      id: `cat-${c.id}`,
      title: c.label,
      subtitle: `Every ${c.short.toLowerCase()} spot in the field guide`,
      coverCategory: c.id,
      count: slugs.length,
      spotSlugs: slugs,
    }
  }).filter((g) => g.count >= 2)

  const freeSlugs = RAW.filter((r) => r.isFree).map((r) => r.slug)
  const free: GuideDto = {
    id: FREE_GUIDE_ID,
    title: 'Free to play',
    subtitle: 'No booking, no fee — just show up',
    coverCategory: 'scenic',
    coverIcon: 'ticket',
    count: freeSlugs.length,
    spotSlugs: freeSlugs,
  }
  return [free, ...byCat]
}

const GUIDES = buildGuides()

/** Contract a real backend client implements later (Node/Spring REST). */
export interface PlacesApi {
  getPlaces(params?: { cat?: CategoryId }): Promise<PlaceCardDto[]>
  getPlace(slug: string): Promise<PlaceDetailDto>
  getCategories(): Promise<CategoryDto[]>
  getGuides(): Promise<GuideDto[]>
  getGuide(id: string): Promise<{ guide: GuideDto; spots: PlaceCardDto[] }>
  createSubmission(input: SubmissionInput): Promise<SubmissionDto>
  createReport(input: ReportInput): Promise<ReportDto>
  uploadPhoto(file: File): Promise<{ url: string }>
  getMySubmissions(): Promise<SubmissionDto[]>
  getMyReports(): Promise<ReportDto[]>
}

// session-lived submissions store (mock). Real backend persists + moderates.
let submissionSeq = 0
let reportSeq = 0

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
  getGuides() {
    return delay(GUIDES)
  },
  getGuide(id) {
    const guide = GUIDES.find((g) => g.id === id)
    if (!guide) return Promise.reject(new Error(`guide not found: ${id}`))
    const bySlug = new Map(RAW.map((r) => [r.slug, r]))
    const spots = guide.spotSlugs
      .map((s) => bySlug.get(s))
      .filter((r): r is RawPlace => !!r)
      .map(toCard)
    return delay({ guide, spots })
  },
  createSubmission(input) {
    submissionSeq += 1
    const sub: SubmissionDto = {
      ...input,
      id: `sub-${submissionSeq}`,
      status: 'PENDING',
      submittedAt: 'just now',
    }
    return delay(sub, 320)
  },
  createReport(input) {
    reportSeq += 1
    const report: ReportDto = {
      ...input,
      id: `rep-${reportSeq}`,
      status: 'OPEN',
      reportedAt: 'just now',
    }
    return delay(report, 320)
  },
  // mock has no object storage — hand back a local object URL so the preview shows
  uploadPhoto(file) {
    return delay({ url: URL.createObjectURL(file) }, 240)
  },
  // mock is session-only (no server); the live PENDING list lives in submissionsStore
  getMySubmissions() {
    return delay([] as SubmissionDto[])
  },
  getMyReports() {
    return delay([] as ReportDto[])
  },
}

/** Swap point: httpPlacesApi when VITE_API_URL is set, mock otherwise.
   Same seam + identical DTO shapes → zero call-site changes either way. */
import { httpPlacesApi } from './httpPlacesApi'
import { useToastStore } from '../store/toastStore'

/* Graceful degradation: a sleeping/erroring backend should never blank the UI.
   On network error (no status) or 5xx, READ paths fall back to the mock dataset
   so the map/guides still render, and a one-time toast tells the user samples
   are showing. 4xx pass through (legit client errors). Writes + auth-gated reads
   (createSubmission/createReport/uploadPhoto, getMy*) stay strict — never faked. */
function isBackendUnavailable(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status
  return status === undefined || status >= 500
}

let warnedUnavailable = false
function warnUnavailableOnce() {
  if (warnedUnavailable) return
  warnedUnavailable = true
  useToastStore.getState().show('Live data unavailable — showing samples', 3200)
}

function withMockFallback<A extends unknown[], R>(
  live: (...args: A) => Promise<R>,
  mock: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    try {
      return await live(...args)
    } catch (err) {
      if (!isBackendUnavailable(err)) throw err
      warnUnavailableOnce()
      return mock(...args)
    }
  }
}

const gracefulHttpPlacesApi: PlacesApi = {
  ...httpPlacesApi,
  getPlaces: withMockFallback(httpPlacesApi.getPlaces, mockPlacesApi.getPlaces),
  getPlace: withMockFallback(httpPlacesApi.getPlace, mockPlacesApi.getPlace),
  getCategories: withMockFallback(httpPlacesApi.getCategories, mockPlacesApi.getCategories),
  getGuides: withMockFallback(httpPlacesApi.getGuides, mockPlacesApi.getGuides),
  getGuide: withMockFallback(httpPlacesApi.getGuide, mockPlacesApi.getGuide),
}

/* Hand-curated editorial guides (no CMS). Cross-category cuts the derived
   per-category guides can't express — a journey, a mood, a circuit. Keyed to
   the seeded spot slugs so they resolve in BOTH mock and live mode. Spots are
   re-derived from getPlaces (GuideDetail uses spotSlugs), so a backend that
   doesn't know these ids never 404s. count = referenced slug count. */
const CURATED_GUIDES: GuideDto[] = [
  {
    id: 'curated-tallinn-afternoon',
    title: 'A perfect Tallinn afternoon',
    subtitle: 'Blossoms, a rooftop view, then ping-pong by the pond',
    coverCategory: 'scenic',
    count: 3,
    spotSlugs: ['kanuti-aed-blossoms', 'patkuli-viewpoint', 'snelli-pond-tables'],
  },
  {
    id: 'curated-sunset-chasers',
    title: 'Sunset chasers',
    subtitle: 'Where Tallinn glows at golden hour',
    coverCategory: 'scenic',
    count: 3,
    spotSlugs: ['patkuli-viewpoint', 'lasnamae-cliff-view', 'lowenruh-pitch'],
  },
  {
    id: 'curated-racket-circuit',
    title: 'Racket sports circuit',
    subtitle: 'Tennis, padel and table tennis across the city',
    coverCategory: 'tennis',
    count: 4,
    spotSlugs: ['kadrioru-tennis-courts', 'pirita-padel-club', 'politseiaia-ping-pong', 'snelli-pond-tables'],
  },
]

/* Decorator: prepend curated guides to whatever the underlying api returns, and
   resolve curated getGuide(id) client-side from getPlaces. Wraps the chosen api
   (mock or http) so the single swap point + DTO contract stay intact. */
function withCuratedGuides(api: PlacesApi): PlacesApi {
  const curatedById = new Map(CURATED_GUIDES.map((g) => [g.id, g]))
  return {
    ...api,
    async getGuides() {
      const live = await api.getGuides()
      return [...CURATED_GUIDES, ...live]
    },
    async getGuide(id) {
      const curated = curatedById.get(id)
      if (!curated) return api.getGuide(id)
      const all = await api.getPlaces()
      const bySlug = new Map(all.map((p) => [p.slug, p]))
      const spots = curated.spotSlugs
        .map((s) => bySlug.get(s))
        .filter((p): p is PlaceCardDto => !!p)
      return { guide: curated, spots }
    },
  }
}

export const placesApi: PlacesApi = withCuratedGuides(
  import.meta.env.VITE_API_URL ? gracefulHttpPlacesApi : mockPlacesApi,
)
