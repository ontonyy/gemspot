/* Client cache of the user's PENDING submissions. Hydrated from the server
   (GET /submissions/mine) on sign-in/boot so it survives reload; `add` prepends
   an optimistic row after a successful POST. */

import { create } from 'zustand'
import type { SubmissionDto } from '../api/types'

interface SubmissionsState {
  items: SubmissionDto[]
  add: (s: SubmissionDto) => void
  set: (items: SubmissionDto[]) => void // hydrate from server / clear on logout
}

export const useSubmissionsStore = create<SubmissionsState>((set) => ({
  items: [],
  add: (s) => set((st) => ({ items: [s, ...st.items] })),
  set: (items) => set({ items }),
}))
