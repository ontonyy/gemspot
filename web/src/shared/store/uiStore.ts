/* Cross-cutting UI state shared between the top bar (search input) and the
   Explore screen list. Kept out of the URL — text query is ephemeral. */

import { create } from 'zustand'

interface UiState {
  searchQuery: string
  setSearchQuery: (q: string) => void
}

export const useUiStore = create<UiState>((set) => ({
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
}))
