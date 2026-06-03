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

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`)
  return res.json() as Promise<T>
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  // submissions/reports are auth-gated server-side; attach the bearer token.
  const token = useAuthStore.getState().accessToken
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = new Error(`${res.status} ${res.statusText} for ${path}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
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
}
