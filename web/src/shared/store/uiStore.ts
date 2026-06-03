/* Cross-cutting UI state shared between the top bar (search input) and the
   Explore screen list. Kept out of the URL — text query is ephemeral.
   Also holds the client-only account-menu open flag (no auth server). */

import { create } from 'zustand'

interface UiState {
  searchQuery: string
  setSearchQuery: (q: string) => void
  accountOpen: boolean
  openAccount: () => void
  closeAccount: () => void
  toggleAccount: () => void
}

export const useUiStore = create<UiState>((set) => ({
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  accountOpen: false,
  openAccount: () => set({ accountOpen: true }),
  closeAccount: () => set({ accountOpen: false }),
  toggleAccount: () => set((s) => ({ accountOpen: !s.accountOpen })),
}))
