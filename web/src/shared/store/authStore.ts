/* Auth session — current user + JWTs, persisted to localStorage (zustand persist)
   so sign-in survives reloads and is available cross-device once the backend is
   wired. Guest = user === null (default). login/register throw on failure so the
   form can surface the message; logout clears locally (stateless server). */

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
  refreshToken: string | null
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
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const apply = (r: AuthResponse): AuthUser => {
        set({ user: r.user, accessToken: r.accessToken, refreshToken: r.refreshToken })
        return r.user
      }
      return {
        user: null,
        accessToken: null,
        refreshToken: null,
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
            set({ user: null, accessToken: null, refreshToken: null })
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
            set({ user: null, accessToken: null, refreshToken: null })
          } finally {
            set({ busy: false })
          }
        },

        // Sign out everywhere — revoke all server sessions (including this one),
        // then clear the local session.
        async logoutAll() {
          const token = get().accessToken
          if (token) await authApi.logoutAll(token).catch(() => undefined)
          set({ user: null, accessToken: null, refreshToken: null })
        },

        logout() {
          authApi.logout().catch(() => undefined)
          set({ user: null, accessToken: null, refreshToken: null })
        },

        // App boot: trade a stored refresh token for a fresh session. Clears on
        // failure (expired/invalid) so a stale token never traps the user.
        async bootstrap() {
          const rt = get().refreshToken
          if (!rt) return
          try {
            apply(await authApi.refresh(rt))
          } catch {
            set({ user: null, accessToken: null, refreshToken: null })
          }
        },
      }
    },
    {
      name: 'gemspot.auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }),
    },
  ),
)
