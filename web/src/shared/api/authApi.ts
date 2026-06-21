/* Auth seam. Mirrors placesApi: http client against VITE_API_URL when set,
   otherwise an in-memory mock so the auth/gating UX is demoable without a
   backend. Tokens are opaque strings the SPA stores in authStore (localStorage).
   Authed methods take the access token explicitly — no hidden global. */

export interface AuthUser {
  id: string
  email: string
  name: string | null
  role: 'CLIENT' | 'ADMIN'
}

export interface AuthResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

export interface RegisterInput {
  email: string
  password: string
  name?: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthApi {
  register(input: RegisterInput): Promise<AuthResponse>
  login(input: LoginInput): Promise<AuthResponse>
  oauthGoogle(idToken: string): Promise<AuthResponse>
  oauthFacebook(accessToken: string): Promise<AuthResponse>
  refresh(refreshToken: string): Promise<AuthResponse>
  logout(): Promise<void>
  me(accessToken: string): Promise<AuthUser>
  // server-backed saved sync (authed)
  listSaved(accessToken: string): Promise<string[]>
  addSaved(accessToken: string, placeId: string): Promise<string[]>
  removeSaved(accessToken: string, placeId: string): Promise<string[]>
  mergeSaved(accessToken: string, placeIds: string[]): Promise<string[]>
}

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

async function call<T>(path: string, init: RequestInit, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...init, headers })
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

const httpAuthApi: AuthApi = {
  register: (input) => call<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),
  login: (input) => call<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  oauthGoogle: (idToken) =>
    call<AuthResponse>('/auth/oauth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),
  oauthFacebook: (accessToken) =>
    call<AuthResponse>('/auth/oauth/facebook', { method: 'POST', body: JSON.stringify({ accessToken }) }),
  refresh: (refreshToken) =>
    call<AuthResponse>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  logout: () => call<void>('/auth/logout', { method: 'POST', body: '{}' }),
  me: (accessToken) => call<AuthUser>('/auth/me', { method: 'GET' }, accessToken),
  listSaved: (accessToken) => call<string[]>('/saved', { method: 'GET' }, accessToken),
  addSaved: (accessToken, placeId) =>
    call<string[]>('/saved', { method: 'POST', body: JSON.stringify({ placeId }) }, accessToken),
  removeSaved: (accessToken, placeId) =>
    call<string[]>(`/saved/${encodeURIComponent(placeId)}`, { method: 'DELETE' }, accessToken),
  mergeSaved: (accessToken, placeIds) =>
    call<string[]>('/saved/merge', { method: 'POST', body: JSON.stringify({ placeIds }) }, accessToken),
}

/* In-memory mock — no persistence beyond the tab. Lets the login screen + auth
   gating work in `npm run dev` with no backend. Saved sync is an echo (the real
   server set lives only when VITE_API_URL points at the NestJS API). */
function mockAuthApi(): AuthApi {
  const users = new Map<string, { id: string; name: string | null; password: string; role: AuthUser['role'] }>()
  // Seed an admin so the role-gated panel is demoable offline (mirrors the
  // backend's prisma seed admin). Real creds come from the API when wired.
  users.set('admin@gemspot.ee', { id: 'u-admin', name: 'GemSpot Admin', password: 'admin1234', role: 'ADMIN' })
  let seq = 0
  const tok = (id: string, kind: string) => `mock.${kind}.${id}`
  const respond = (email: string): AuthResponse => {
    const u = users.get(email)!
    return {
      user: { id: u.id, email, name: u.name, role: u.role },
      accessToken: tok(u.id, 'access'),
      refreshToken: tok(u.id, 'refresh'),
    }
  }
  const delay = <T>(v: T, ms = 200) => new Promise<T>((r) => setTimeout(() => r(v), ms))
  return {
    async register(input) {
      const email = input.email.toLowerCase().trim()
      if (users.has(email)) throw new Error('Email already registered')
      seq += 1
      users.set(email, { id: `u-${seq}`, name: input.name?.trim() || null, password: input.password, role: 'CLIENT' })
      return delay(respond(email))
    },
    async login(input) {
      const email = input.email.toLowerCase().trim()
      const u = users.get(email)
      if (!u || u.password !== input.password) throw new Error('Invalid email or password')
      return delay(respond(email))
    },
    async oauthGoogle(idToken) {
      // Mock mode has no backend to verify against. Best-effort decode of the
      // GIS credential payload for a believable demo user; falls back to a
      // placeholder. Links by email like the real flow.
      let email = 'google-user@gmail.com'
      let name: string | null = 'Google User'
      try {
        const payload = JSON.parse(atob(idToken.split('.')[1] ?? '')) as { email?: string; name?: string }
        if (payload.email) email = payload.email.toLowerCase()
        if (payload.name) name = payload.name
      } catch {
        /* not a JWT — keep placeholder */
      }
      let u = users.get(email)
      if (!u) {
        seq += 1
        u = { id: `u-${seq}`, name, password: '', role: 'CLIENT' }
        users.set(email, u)
      }
      return delay(respond(email))
    },
    async oauthFacebook(_accessToken) {
      // Mock mode has no backend / Graph API to verify against. A FB user access
      // token is opaque (not a JWT), so we can't decode a profile — use a stable
      // placeholder demo user. Links by email like the real flow.
      const email = 'facebook-user@example.com'
      let u = users.get(email)
      if (!u) {
        seq += 1
        u = { id: `u-${seq}`, name: 'Facebook User', password: '', role: 'CLIENT' }
        users.set(email, u)
      }
      return delay(respond(email))
    },
    async refresh(refreshToken) {
      const id = refreshToken.split('.')[2]
      const entry = [...users.entries()].find(([, u]) => u.id === id)
      if (!entry) throw new Error('Invalid refresh token')
      return delay(respond(entry[0]))
    },
    async logout() {
      return delay(undefined)
    },
    async me(accessToken) {
      const id = accessToken.split('.')[2]
      const entry = [...users.entries()].find(([, u]) => u.id === id)
      if (!entry) throw new Error('Account not found')
      return { id, email: entry[0], name: entry[1].name, role: entry[1].role }
    },
    async listSaved() {
      return delay([])
    },
    async addSaved(_t, _p) {
      return delay([])
    },
    async removeSaved(_t, _p) {
      return delay([])
    },
    async mergeSaved(_t, placeIds) {
      return delay(placeIds)
    },
  }
}

export const authApi: AuthApi = import.meta.env.VITE_API_URL ? httpAuthApi : mockAuthApi()
