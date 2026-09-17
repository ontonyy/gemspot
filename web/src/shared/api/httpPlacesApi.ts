/* Real backend client. Implements the same PlacesApi seam as mockPlacesApi by
   fetching the NestJS API (web/../backend). Reads VITE_API_URL; selected over
   the mock in placesApi.ts only when that env var is set. Response shapes are
   byte-identical to the mock (backend mirrors types.ts), so call sites are
   unchanged. */

import type {
  CategoryDto, GuideDto, PlaceCardDto, PlaceDetailDto,
  ReportDto, ReportInput, SubmissionDto, SubmissionInput,
} from './types'
import type { PlacesApi } from './placesApi'
import { BASE, authedFetch } from './authedFetch'


function fail(res: Response, path: string): Error & { status?: number } {
  const err = new Error(`${res.status} ${res.statusText} for ${path}`) as Error & { status?: number }
  err.status = res.status
  return err
}

async function getJson<T>(path: string, auth = false): Promise<T> {
  const res = auth
    ? await authedFetch((token) => ({
        url: `${BASE}${path}`,
        init: { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
      }))
    : await fetch(`${BASE}${path}`)
  if (!res.ok) throw fail(res, path)
  return res.json() as Promise<T>
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  // submissions/reports are auth-gated server-side; attach the bearer token.
  const res = await authedFetch((token) => ({
    url: `${BASE}${path}`,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    },
  }))
  if (!res.ok) throw fail(res, path)
  return res.json() as Promise<T>
}

export const httpPlacesApi: PlacesApi = {
  getPlaces(params) {
    const q = params?.cat ? `?cat=${encodeURIComponent(params.cat)}` : ''
    return getJson<PlaceCardDto[]>(`/places${q}`)
  },
  getPlace(slug) {
    return getJson<PlaceDetailDto>(`/places/${encodeURIComponent(slug)}`)
  },
  getCategories() {
    return getJson<CategoryDto[]>('/categories')
  },
  getGuides() {
    return getJson<GuideDto[]>('/guides')
  },
  getGuide(id) {
    return getJson<{ guide: GuideDto; spots: PlaceCardDto[] }>(`/guides/${encodeURIComponent(id)}`)
  },
  createSubmission(input: SubmissionInput) {
    return postJson<SubmissionDto>('/submissions', input)
  },
  createReport(input: ReportInput) {
    return postJson<ReportDto>('/reports', input)
  },
  async uploadPhoto(file: File) {
    // FormData is single-use; rebuild it per attempt so the 401 retry resends.
    const res = await authedFetch((token) => {
      const form = new FormData()
      form.append('file', file)
      return {
        url: `${BASE}/uploads`,
        init: {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: form,
        },
      }
    })
    if (!res.ok) throw fail(res, '/uploads')
    return res.json() as Promise<{ url: string }>
  },
  getMySubmissions() {
    return getJson<SubmissionDto[]>('/submissions/mine', true)
  },
  getMyReports() {
    return getJson<ReportDto[]>('/reports/mine', true)
  },
}
