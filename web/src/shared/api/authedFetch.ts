/* Single home for the HTTP plumbing shared by every client in this
   folder: the API base URL and the 401 -> refresh -> retry-once seam. New API
   clients build on this rather than calling fetch directly. */

import { useAuthStore } from '../store/authStore'

export const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/* The access token is short-lived (15m); an open tab outlives it, so any authed
   call can 401 mid-session. authedFetch attaches the current token and, on a 401,
   trades the (30d) refresh token for a fresh access token and retries once before
   giving up. `build` is re-run per attempt so the retry uses the new token and a
   fresh request body (FormData/streams are single-use). */
export async function authedFetch(
  build: (token: string | null) => { url: string; init: RequestInit },
): Promise<Response> {
  const attempt = (token: string | null) => {
    const { url, init } = build(token)
    return fetch(url, init)
  }
  let res = await attempt(useAuthStore.getState().accessToken)
  if (res.status === 401 && useAuthStore.getState().refreshToken) {
    const ok = await useAuthStore.getState().refreshSession()
    if (ok) res = await attempt(useAuthStore.getState().accessToken)
  }
  return res
}

/* Shared response tail. The backend answers errors with `{message}` (a string, or
   an array of them from class-validator); unwrap it so call sites get the server's
   words rather than "400 Bad Request". `err.status` is what callers branch on.
   Note: httpPlacesApi deliberately does NOT use this — its errors name the path
   and never read the body (see plan 030). */
export async function throwHttp(res: Response): Promise<never> {
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

/* 204 has no body to parse; every other ok response is JSON. */
export function parseBody<T>(res: Response): Promise<T> {
  if (res.status === 204) return Promise.resolve(undefined as T)
  return res.json() as Promise<T>
}
