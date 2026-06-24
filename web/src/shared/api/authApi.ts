/* Auth seam. Mirrors placesApi: http client against VITE_API_URL when set,
   otherwise an in-memory mock so the auth/gating UX is demoable without a
   backend. Tokens are opaque strings the SPA stores in authStore (localStorage).
   Authed methods take the access token explicitly — no hidden global. */

export interface AuthUser {
  id: string
  email: string
  name: string | null
  role: 'CLIENT' | 'ADMIN'
  avatarUrl?: string | null
  provider?: string | null
  createdAt?: string | null
  hasPassword?: boolean
  // Derived email-change state (formalized server-side, not guessed here).
  pendingEmail?: string | null
  pendingExpiresAt?: string | null
  emailChangeStatus?: 'none' | 'pending' | 'expired'
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

export interface UpdateProfileInput {
  name?: string | null
  avatarUrl?: string | null
}

export interface ChangePasswordInput {
  // Required only for accounts that already have a local password. OAuth-only
  // accounts set an initial password without one.
  currentPassword?: string
  newPassword: string
}

export interface EmailChangeRequestInput {
  newEmail: string
  // Required only for accounts with a local password (re-auth).
  currentPassword?: string
}

export interface DeleteAccountInput {
  // Required only for accounts with a local password (re-auth).
  currentPassword?: string
}

export interface AuthApi {
  register(input: RegisterInput): Promise<AuthResponse>
  login(input: LoginInput): Promise<AuthResponse>
  oauthGoogle(idToken: string): Promise<AuthResponse>
  refresh(refreshToken: string): Promise<AuthResponse>
  logout(): Promise<void>
  me(accessToken: string): Promise<AuthUser>
  // own-profile edit (authed): PATCH /auth/me + multipart POST /uploads
  updateProfile(accessToken: string, input: UpdateProfileInput): Promise<AuthUser>
  uploadAvatar(accessToken: string, file: File): Promise<string>
  // security (authed): set/change local password (returns fresh tokens for the
  // acting device; other sessions revoked) + sign out everywhere
  changePassword(accessToken: string, input: ChangePasswordInput): Promise<AuthResponse>
  logoutAll(accessToken: string): Promise<void>
  // verified email change (authed request → mail link → public verify)
  requestEmailChange(accessToken: string, input: EmailChangeRequestInput): Promise<AuthUser>
  verifyEmailChange(token: string): Promise<void>
  // account lifecycle (authed): permanently delete the acting account
  deleteAccount(accessToken: string, input: DeleteAccountInput): Promise<void>
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
  refresh: (refreshToken) =>
    call<AuthResponse>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  logout: () => call<void>('/auth/logout', { method: 'POST', body: '{}' }),
  me: (accessToken) => call<AuthUser>('/auth/me', { method: 'GET' }, accessToken),
  updateProfile: (accessToken, input) =>
    call<AuthUser>('/auth/me', { method: 'PATCH', body: JSON.stringify(input) }, accessToken),
  uploadAvatar: async (accessToken, file) => {
    // multipart: let the browser set the boundary content-type, so no JSON header here.
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${BASE}/uploads`, {
      method: 'POST',
      body: form,
      headers: { Authorization: `Bearer ${accessToken}` },
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
    const body = (await res.json()) as { url: string }
    return body.url
  },
  changePassword: (accessToken, input) =>
    call<AuthResponse>('/auth/password', { method: 'POST', body: JSON.stringify(input) }, accessToken),
  logoutAll: (accessToken) =>
    call<void>('/auth/logout-all', { method: 'POST', body: '{}' }, accessToken),
  requestEmailChange: (accessToken, input) =>
    call<AuthUser>('/auth/email/change-request', { method: 'POST', body: JSON.stringify(input) }, accessToken),
  verifyEmailChange: (token) =>
    call<void>('/auth/email/verify', { method: 'POST', body: JSON.stringify({ token }) }),
  deleteAccount: (accessToken, input) =>
    call<void>('/auth/me', { method: 'DELETE', body: JSON.stringify(input) }, accessToken),
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
  interface MockUser {
    id: string
    name: string | null
    password: string
    role: AuthUser['role']
    avatarUrl: string | null
    provider: string | null
    createdAt: string
    // pending verified email change (mirrors email_change_tokens)
    pendingEmail: string | null
    pendingExpiresAt: string | null
    pendingToken: string | null
  }
  const users = new Map<string, MockUser>()
  // Seed an admin so the role-gated panel is demoable offline (mirrors the
  // backend's prisma seed admin). Real creds come from the API when wired.
  users.set('admin@gemspot.ee', {
    id: 'u-admin', name: 'GemSpot Admin', password: 'admin1234', role: 'ADMIN',
    avatarUrl: null, provider: null, createdAt: '2025-01-01T00:00:00.000Z',
    pendingEmail: null, pendingExpiresAt: null, pendingToken: null,
  })
  let seq = 0
  const tok = (id: string, kind: string) => `mock.${kind}.${id}`
  const view = (email: string, u: MockUser): AuthUser => {
    const status: AuthUser['emailChangeStatus'] = !u.pendingEmail
      ? 'none'
      : u.pendingExpiresAt && new Date(u.pendingExpiresAt).getTime() > Date.now()
        ? 'pending'
        : 'expired'
    return {
      id: u.id, email, name: u.name, role: u.role,
      avatarUrl: u.avatarUrl, provider: u.provider, createdAt: u.createdAt,
      hasPassword: u.password !== '',
      pendingEmail: u.pendingEmail, pendingExpiresAt: u.pendingExpiresAt, emailChangeStatus: status,
    }
  }
  const respond = (email: string): AuthResponse => {
    const u = users.get(email)!
    return {
      user: view(email, u),
      accessToken: tok(u.id, 'access'),
      refreshToken: tok(u.id, 'refresh'),
    }
  }
  const nowIso = () => new Date().toISOString()
  const delay = <T>(v: T, ms = 200) => new Promise<T>((r) => setTimeout(() => r(v), ms))
  return {
    async register(input) {
      const email = input.email.toLowerCase().trim()
      if (users.has(email)) throw new Error('Email already registered')
      seq += 1
      users.set(email, {
        id: `u-${seq}`, name: input.name?.trim() || null, password: input.password, role: 'CLIENT',
        avatarUrl: null, provider: null, createdAt: nowIso(),
        pendingEmail: null, pendingExpiresAt: null, pendingToken: null,
      })
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
        u = {
          id: `u-${seq}`, name, password: '', role: 'CLIENT', avatarUrl: null, provider: 'google',
          createdAt: nowIso(), pendingEmail: null, pendingExpiresAt: null, pendingToken: null,
        }
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
      return delay(view(entry[0], entry[1]))
    },
    async updateProfile(accessToken, input) {
      const id = accessToken.split('.')[2]
      const entry = [...users.entries()].find(([, u]) => u.id === id)
      if (!entry) throw new Error('Account not found')
      const u = entry[1]
      if (input.name !== undefined) u.name = input.name?.trim() || null
      if (input.avatarUrl !== undefined) u.avatarUrl = input.avatarUrl?.trim() || null
      return delay(view(entry[0], u))
    },
    async uploadAvatar(_accessToken, file) {
      // No real storage offline — hand back a local object URL for a believable demo.
      return delay(URL.createObjectURL(file))
    },
    async changePassword(accessToken, input) {
      const id = accessToken.split('.')[2]
      const entry = [...users.entries()].find(([, u]) => u.id === id)
      if (!entry) throw new Error('Account not found')
      const [email, u] = entry
      // Local account: require a matching current password. OAuth-only (password
      // === '') may set one without it.
      if (u.password !== '' && u.password !== input.currentPassword) {
        throw new Error('Current password is incorrect')
      }
      u.password = input.newPassword
      // Fresh tokens for the acting device (mirrors backend revoke-all + re-mint).
      return delay(respond(email))
    },
    async requestEmailChange(accessToken, input) {
      const id = accessToken.split('.')[2]
      const entry = [...users.entries()].find(([, u]) => u.id === id)
      if (!entry) throw new Error('Account not found')
      const [email, u] = entry
      const newEmail = input.newEmail.toLowerCase().trim()
      // Re-auth for local accounts.
      if (u.password !== '' && u.password !== input.currentPassword) {
        throw new Error('Current password is incorrect')
      }
      if (newEmail === email) throw new Error('That is already your email')
      if (users.has(newEmail)) throw new Error('Email already registered')
      seq += 1
      u.pendingEmail = newEmail
      u.pendingToken = `mock.ect.${seq}`
      u.pendingExpiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      return delay(view(email, u))
    },
    async verifyEmailChange(token) {
      const entry = [...users.entries()].find(([, u]) => u.pendingToken === token)
      if (!entry) throw new Error('Invalid or expired link')
      const [oldEmail, u] = entry
      if (!u.pendingEmail || !u.pendingExpiresAt
          || new Date(u.pendingExpiresAt).getTime() <= Date.now()) {
        throw new Error('Invalid or expired link')
      }
      // Swap the map key to the new email; clear pending state.
      const newEmail = u.pendingEmail
      users.delete(oldEmail)
      u.pendingEmail = null
      u.pendingToken = null
      u.pendingExpiresAt = null
      users.set(newEmail, u)
      return delay(undefined)
    },
    async deleteAccount(accessToken, input) {
      const id = accessToken.split('.')[2]
      const entry = [...users.entries()].find(([, u]) => u.id === id)
      if (!entry) throw new Error('Account not found')
      const [email, u] = entry
      // Re-auth for local accounts (OAuth-only password === '' deletes via session).
      if (u.password !== '' && u.password !== input.currentPassword) {
        throw new Error('Current password is incorrect')
      }
      users.delete(email)
      return delay(undefined)
    },
    async logoutAll() {
      return delay(undefined)
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
