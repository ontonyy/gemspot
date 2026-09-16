/* Single home for the authed-request plumbing shared by every client in this
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
