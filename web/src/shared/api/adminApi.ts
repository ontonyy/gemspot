/* Admin/moderation seam. Mirrors authApi/placesApi: http client against
   VITE_API_URL when set, otherwise an in-memory mock so the role-gated panel is
   demoable without a backend. Authed methods take the access token explicitly.
   These types are admin-only and independent of the public DTO contract. */

import type { CategoryId } from '../../entities/place/categories'

export type AdminPlaceStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT'
export type AdminSubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type AdminReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED'

export interface AdminStats {
  places: number
  activePlaces: number
  pendingSubmissions: number
  openReports: number
  users: number
}

export interface AdminSubmission {
  id: string
  name: string
  categoryId: CategoryId
  lat: number
  lng: number
  note: string
  photoUrls: string[]
  status: AdminSubmissionStatus
  submittedAt: string
  submitterEmail: string | null
}

export interface AdminPlace {
  id: string
  slug: string
  name: string
  neighborhood: string
  categoryId: string
  status: AdminPlaceStatus
  isFree: boolean
  savesCount: number
}

export interface AdminReport {
  id: string
  placeSlug: string
  placeName: string
  reason: string
  note: string | null
  status: AdminReportStatus
  reportedAt: string
  reporterEmail: string | null
}

export interface AdminUser {
  id: string
  email: string
  name: string | null
  role: 'CLIENT' | 'ADMIN'
  createdAt: string
}

export interface EventCount {
  name: string
  count: number
}

export interface AdminApi {
  stats(token: string): Promise<AdminStats>
  eventCounts(token: string): Promise<EventCount[]>
  listSubmissions(token: string, status?: AdminSubmissionStatus): Promise<AdminSubmission[]>
  approveSubmission(token: string, id: string): Promise<{ placeId: string; placeSlug: string }>
  rejectSubmission(token: string, id: string): Promise<void>
  listPlaces(token: string): Promise<AdminPlace[]>
  setPlaceStatus(token: string, id: string, status: AdminPlaceStatus): Promise<AdminPlace>
  listReports(token: string, status?: AdminReportStatus): Promise<AdminReport[]>
  setReportStatus(token: string, id: string, status: AdminReportStatus): Promise<AdminReport>
  listUsers(token: string): Promise<AdminUser[]>
}

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

async function call<T>(path: string, init: RequestInit, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const body = (await res.json()) as { message?: string | string[] }
      if (body?.message) message = Array.isArray(body.message) ? body.message.join(', ') : body.message
    } catch {
      /* non-JSON error body */
    }
    const err = new Error(message) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const httpAdminApi: AdminApi = {
  stats: (t) => call('/admin/stats', { method: 'GET' }, t),
  eventCounts: (t) => call('/admin/events', { method: 'GET' }, t),
  listSubmissions: (t, status) =>
    call(`/admin/submissions${status ? `?status=${status}` : ''}`, { method: 'GET' }, t),
  approveSubmission: (t, id) =>
    call(`/admin/submissions/${encodeURIComponent(id)}/approve`, { method: 'POST', body: '{}' }, t),
  rejectSubmission: (t, id) =>
    call(`/admin/submissions/${encodeURIComponent(id)}/reject`, { method: 'POST', body: '{}' }, t),
  listPlaces: (t) => call('/admin/places', { method: 'GET' }, t),
  setPlaceStatus: (t, id, status) =>
    call(`/admin/places/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, t),
  listReports: (t, status) =>
    call(`/admin/reports${status ? `?status=${status}` : ''}`, { method: 'GET' }, t),
  setReportStatus: (t, id, status) =>
    call(`/admin/reports/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, t),
  listUsers: (t) => call('/admin/users', { method: 'GET' }, t),
}

/* In-memory mock — demo data so the panel renders + actions visibly mutate
   state in `npm run dev` with no backend. Not persisted beyond the tab. */
function mockAdminApi(): AdminApi {
  let subs: AdminSubmission[] = [
    {
      id: 'sub-1', name: 'Kalamaja street court', categoryId: 'basketball',
      lat: 59.45, lng: 24.73, note: 'Half-court behind the old factory, open dawn-dusk.',
      photoUrls: [], status: 'PENDING', submittedAt: '2 hours ago', submitterEmail: 'local@gemspot.ee',
    },
    {
      id: 'sub-2', name: 'Telliskivi ping pong', categoryId: 'tabletennis',
      lat: 59.44, lng: 24.72, note: 'Two concrete tables in the courtyard.',
      photoUrls: [], status: 'PENDING', submittedAt: '1 day ago', submitterEmail: null,
    },
  ]
  const places: AdminPlace[] = [
    { id: '01', slug: 'snelli-pond', name: 'Snelli pond', neighborhood: 'Kesklinn', categoryId: 'scenic', status: 'ACTIVE', isFree: true, savesCount: 42 },
    { id: '02', slug: 'kadrioru-tennis', name: 'Kadrioru tennis', neighborhood: 'Kadriorg', categoryId: 'tennis', status: 'ACTIVE', isFree: false, savesCount: 12 },
  ]
  let reports: AdminReport[] = [
    { id: 'rep-1', placeSlug: 'snelli-pond', placeName: 'Snelli pond', reason: 'closed', note: 'Fenced off for works.', status: 'OPEN', reportedAt: '3 hours ago', reporterEmail: 'user@gemspot.ee' },
  ]
  const users: AdminUser[] = [
    { id: 'u-admin', email: 'admin@gemspot.ee', name: 'GemSpot Admin', role: 'ADMIN', createdAt: 'just now' },
    { id: 'u-1', email: 'local@gemspot.ee', name: 'Local explorer', role: 'CLIENT', createdAt: '2 days ago' },
  ]
  const delay = <T>(v: T, ms = 180) => new Promise<T>((r) => setTimeout(() => r(v), ms))
  return {
    eventCounts: () => delay([
      { name: 'pin', count: 128 },
      { name: 'save', count: 64 },
      { name: 'directions', count: 41 },
      { name: 'share', count: 22 },
      { name: 'filter', count: 73 },
      { name: 'submission', count: 9 },
    ]),
    stats: () => delay({
      places: places.length,
      activePlaces: places.filter((p) => p.status === 'ACTIVE').length,
      pendingSubmissions: subs.filter((s) => s.status === 'PENDING').length,
      openReports: reports.filter((r) => r.status === 'OPEN').length,
      users: users.length,
    }),
    listSubmissions: (_t, status) =>
      delay(status ? subs.filter((s) => s.status === status) : subs),
    approveSubmission: (_t, id) => {
      subs = subs.map((s) => (s.id === id ? { ...s, status: 'APPROVED' } : s))
      const s = subs.find((x) => x.id === id)
      const slug = (s?.name ?? 'spot').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      places.push({ id: String(places.length + 1).padStart(2, '0'), slug, name: s?.name ?? '', neighborhood: 'Tallinn', categoryId: s?.categoryId ?? '', status: 'ACTIVE', isFree: true, savesCount: 0 })
      return delay({ placeId: String(places.length).padStart(2, '0'), placeSlug: slug })
    },
    rejectSubmission: (_t, id) => {
      subs = subs.map((s) => (s.id === id ? { ...s, status: 'REJECTED' } : s))
      return delay(undefined)
    },
    listPlaces: () => delay(places),
    setPlaceStatus: (_t, id, status) => {
      const p = places.find((x) => x.id === id)!
      p.status = status
      return delay({ ...p })
    },
    listReports: (_t, status) => delay(status ? reports.filter((r) => r.status === status) : reports),
    setReportStatus: (_t, id, status) => {
      reports = reports.map((r) => (r.id === id ? { ...r, status } : r))
      return delay(reports.find((r) => r.id === id)!)
    },
    listUsers: () => delay(users),
  }
}

export const adminApi: AdminApi = import.meta.env.VITE_API_URL ? httpAdminApi : mockAdminApi()
