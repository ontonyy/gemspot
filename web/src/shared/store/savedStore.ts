/* Saved/bookmarked places — single "save" metaphor (no hearts/ratings).
   Set of place ids, persisted to localStorage so guest saves survive reloads.
   When signed in, the same set is mirrored to the server (saved_places) so saves
   sync cross-device; on login the guest set is merged in (see AuthPage). Local
   state stays the source of truth for instant UI; server calls are fire-and-forget
   and reconcile the set from the authoritative response. */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../api/authApi'
import { useAuthStore } from './authStore'

interface SavedState {
  ids: string[]
  isSaved: (id: string) => boolean
  toggle: (id: string) => boolean // returns new saved state
  replace: (ids: string[]) => void // after login merge / server reconcile
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      ids: [],
      isSaved: (id) => get().ids.includes(id),
      toggle: (id) => {
        const has = get().ids.includes(id)
        set({ ids: has ? get().ids.filter((x) => x !== id) : [...get().ids, id] })
        // server sync when authed; reconcile from the authoritative response
        const token = useAuthStore.getState().accessToken
        if (token) {
          const op = has ? authApi.removeSaved(token, id) : authApi.addSaved(token, id)
          op.then((serverIds) => set({ ids: serverIds })).catch(() => undefined)
        }
        return !has
      },
      replace: (ids) => set({ ids }),
    }),
    { name: 'gemspot.saved' },
  ),
)
