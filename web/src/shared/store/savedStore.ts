/* Saved/bookmarked places — single "save" metaphor (no hearts/ratings).
   Set of place ids; persisted to localStorage so saves survive reloads
   (stand-in for the authed Favorite entity in the backend). */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SavedState {
  ids: string[]
  isSaved: (id: string) => boolean
  toggle: (id: string) => boolean // returns new saved state
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      ids: [],
      isSaved: (id) => get().ids.includes(id),
      toggle: (id) => {
        const has = get().ids.includes(id)
        set({ ids: has ? get().ids.filter((x) => x !== id) : [...get().ids, id] })
        return !has
      },
    }),
    { name: 'gemspot.saved' },
  ),
)
