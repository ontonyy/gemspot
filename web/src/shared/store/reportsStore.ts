/* Client cache of problem reports the user filed this session (OPEN moderation).
   Survives navigation; not persisted (mock — real backend owns the record). */

import { create } from 'zustand'
import type { ReportDto } from '../api/types'

interface ReportsState {
  items: ReportDto[]
  add: (r: ReportDto) => void
}

export const useReportsStore = create<ReportsState>((set) => ({
  items: [],
  add: (r) => set((st) => ({ items: [r, ...st.items] })),
}))
