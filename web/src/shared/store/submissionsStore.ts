/* Client cache of spots the user submitted this session (PENDING moderation).
   Survives navigation; not persisted (mock — real backend owns the record). */

import { create } from 'zustand'
import type { SubmissionDto } from '../api/types'

interface SubmissionsState {
  items: SubmissionDto[]
  add: (s: SubmissionDto) => void
}

export const useSubmissionsStore = create<SubmissionsState>((set) => ({
  items: [],
  add: (s) => set((st) => ({ items: [s, ...st.items] })),
}))
