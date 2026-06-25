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
import { useAuthStore } from '../store/authStore'

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/* The access token is short-lived (15m); an open tab outlives it. Any auth call
   can therefore 401 mid-session. authedFetch attaches the current token, and on
   a 401 trades the (30d) refresh token for a fresh access token and retries once
   before giving up. `build` is re-run per attempt so the retry uses the new token
   and a fresh request body (FormData/streams are single-use). */
async function authedFetch(
  build: (token: string | null) => { url: string; init: RequestInit },
): Promise<Response> {
  const auth = useAuthStore.getState()
  const attempt = (token: string | null) => {
    const { url, init } = build(token)
    return fetch(url, init)
  }
  let res = await attempt(auth.accessToken)
  if (res.status === 401 && useAuthStore.getState().refreshToken) {
    const ok = await useAuthStore.getState().refreshSession()
    if (ok) res = await attempt(useAuthStore.getState().accessToken)
  }
  return res
}

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
