/* Auth session — current user + the short-lived access token, persisted to
   localStorage (zustand persist) so sign-in survives reloads.

   The REFRESH token is deliberately absent from this store (plan 032 / ADR 0006).
   It lives in an HttpOnly cookie the browser attaches to /auth/refresh and
   /auth/logout on its own, so an XSS cannot copy the 30-day credential off the
   machine — it can still act as the user while the page is open, which is a
   different and smaller thing. Nothing here may read or store it again.

   Guest = user === null (default). login/register throw on failure so the form
   can surface the message; logout asks the server to clear the cookie. */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  authApi,
  type AuthResponse,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
  type UpdateProfileInput,
  type ChangePasswordInput,
  type EmailChangeRequestInput,
  type DeleteAccountInput,
} from '../api/authApi'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  busy: boolean
  register: (input: RegisterInput) => Promise<AuthUser>
  login: (input: LoginInput) => Promise<AuthUser>
  loginWithGoogle: (idToken: string) => Promise<AuthUser>
  loginWithFacebook: (accessToken: string) => Promise<AuthUser>
  updateProfile: (input: UpdateProfileInput) => Promise<AuthUser>
  uploadAvatar: (file: File) => Promise<string>
  changePassword: (input: ChangePasswordInput) => Promise<void>
  requestEmailChange: (input: EmailChangeRequestInput) => Promise<AuthUser>
  verifyEmailChange: (token: string) => Promise<void>
  deleteAccount: (input: DeleteAccountInput) => Promise<void>
  logoutAll: () => Promise<void>
  logout: () => void
  bootstrap: () => Promise<void>
  /** Trade the refresh cookie for a fresh access token. Returns true on success.
      Concurrent callers share one in-flight request. Clears session on failure so
      a dead refresh cookie can't loop. */
  refreshSession: () => Promise<boolean>
}

/* Module-level dedupe: many 401s can fire at once (parallel requests); they must
   all await the same single /auth/refresh, not stampede it. */
let refreshInFlight: Promise<boolean> | null = null

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const apply = (r: AuthResponse): AuthUser => {
        set({ user: r.user, accessToken: r.accessToken })
        return r.user
      }
      return {
        user: null,
        accessToken: null,
        busy: false,

        async register(input) {
          set({ busy: true })
          try {
            return apply(await authApi.register(input))
          } finally {
            set({ busy: false })
          }
        },

        async login(input) {
          set({ busy: true })
          try {
            return apply(await authApi.login(input))
          } finally {
            set({ busy: false })
          }
        },

        async loginWithGoogle(idToken) {
          set({ busy: true })
          try {
            return apply(await authApi.oauthGoogle(idToken))
          } finally {
            set({ busy: false })
          }
        },

        async loginWithFacebook(accessToken) {
          set({ busy: true })
          try {
            return apply(await authApi.oauthFacebook(accessToken))
          } finally {
            set({ busy: false })
          }
        },

        // Own-profile edit (authed). Refresh the stored user so topbar/menu
        // avatar + name update live. Requires a session (access token present).
        async updateProfile(input) {
          const token = get().accessToken
          if (!token) throw new Error('Not signed in')
          set({ busy: true })
          try {
            const user = await authApi.updateProfile(token, input)
            set({ user })
            return user
          } finally {
            set({ busy: false })
          }
        },

        // Upload an avatar image, then persist its URL via updateProfile.
        async uploadAvatar(file) {
          const token = get().accessToken
          if (!token) throw new Error('Not signed in')
          set({ busy: true })
          try {
            const url = await authApi.uploadAvatar(token, file)
            const user = await authApi.updateProfile(token, { avatarUrl: url })
            set({ user })
            return url
          } finally {
            set({ busy: false })
          }
        },

        // Set/change local password. Backend revokes other sessions and returns a
        // fresh token pair for THIS device — apply it so the user stays signed in
        // here (hasPassword flips true after a set).
        async changePassword(input) {
          const token = get().accessToken
          if (!token) throw new Error('Not signed in')
          set({ busy: true })
          try {
            apply(await authApi.changePassword(token, input))
          } finally {
            set({ busy: false })
          }
        },

        // Request a verified email change. Re-auths on the server, mails the link
        // to the new address; the returned view carries the pending state, which
        // we store so the Security section reflects it immediately.
        async requestEmailChange(input) {
          const token = get().accessToken
          if (!token) throw new Error('Not signed in')
          set({ busy: true })
          try {
            const user = await authApi.requestEmailChange(token, input)
            set({ user })
            return user
          } finally {
            set({ busy: false })
          }
        },

        // Consume a verification link's token (public — no session needed). The
        // server swaps the email and revokes all sessions, so any local session
        // is now stale: clear it and let the user sign in with the new email.
        async verifyEmailChange(token) {
          set({ busy: true })
          try {
            await authApi.verifyEmailChange(token)
            set({ user: null, accessToken: null })
          } finally {
            set({ busy: false })
          }
        },

        // Permanently delete the account. Re-auths on the server (current
        // password for local accounts), cascades children there, then clears
        // the now-defunct local session.
        async deleteAccount(input) {
          const token = get().accessToken
          if (!token) throw new Error('Not signed in')
          set({ busy: true })
          try {
            await authApi.deleteAccount(token, input)
            set({ user: null, accessToken: null })
          } finally {
            set({ busy: false })
          }
        },

        // Sign out everywhere — revoke all server sessions (including this one),
        // then clear the local session.
        async logoutAll() {
          const token = get().accessToken
          if (token) await authApi.logoutAll(token).catch(() => undefined)
          set({ user: null, accessToken: null })
        },

        logout() {
          authApi.logout().catch(() => undefined)
          set({ user: null, accessToken: null })
        },

        // App boot: trade the refresh cookie for a fresh session. We cannot see the
        // cookie, so a persisted user is the signal that there might be one; a 401
        // (no cookie / expired) clears the session rather than trapping the user.
        async bootstrap() {
          if (!get().user) return
          try {
            apply(await authApi.refresh())
          } catch {
            set({ user: null, accessToken: null })
          }
        },

        refreshSession() {
          if (refreshInFlight) return refreshInFlight
          refreshInFlight = (async () => {
            try {
              apply(await authApi.refresh())
              return true
            } catch {
              set({ user: null, accessToken: null })
              return false
            } finally {
              refreshInFlight = null
            }
          })()
          return refreshInFlight
        },
      }
    },
    {
      name: 'gemspot.auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
      /* v2 (plan 032): the refresh token moved to an HttpOnly cookie. This drops
         the one a v1 client already wrote — it is a live 30d credential sitting in
         localStorage, so deleting it is the point, not housekeeping. Nothing reads
         it: existing users are signed out once and sign in again, which is the
         whole migration. Keep this migrate until v1 state is safely extinct. */
      version: 2,
      migrate: (persisted) => {
        const { refreshToken: _dropped, ...rest } = (persisted ?? {}) as Record<string, unknown>
        return rest as { user: AuthUser | null; accessToken: string | null }
      },
    },
  ),
)
