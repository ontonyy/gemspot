/* Which spot detail panel is open. Holds slug (stable id used by usePlace).
   null = panel closed. */

import { create } from 'zustand'

interface DetailState {
  slug: string | null
  open: (slug: string) => void
  close: () => void
}

export const useDetailStore = create<DetailState>((set) => ({
  slug: null,
  open: (slug) => set({ slug }),
  close: () => set({ slug: null }),
}))
