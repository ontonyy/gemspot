/* Auth session — current user + JWTs, persisted to localStorage (zustand persist)
   so sign-in survives reloads and is available cross-device once the backend is
   wired. Guest = user === null (default). login/register throw on failure so the
   form can surface the message; logout clears locally (stateless server). */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi, type AuthResponse, type AuthUser, type LoginInput, type RegisterInput } from '../api/authApi'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  busy: boolean
  register: (input: RegisterInput) => Promise<AuthUser>
  login: (input: LoginInput) => Promise<AuthUser>
  loginWithGoogle: (idToken: string) => Promise<AuthUser>
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
