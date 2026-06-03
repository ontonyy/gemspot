/* Client cache of the user's OPEN problem reports. Hydrated from the server
   (GET /reports/mine) on sign-in/boot so it survives reload; `add` prepends an
   optimistic row after a successful POST. */

import { create } from 'zustand'
import type { ReportDto } from '../api/types'

interface ReportsState {
  items: ReportDto[]
  add: (r: ReportDto) => void
  set: (items: ReportDto[]) => void // hydrate from server / clear on logout
}

export const useReportsStore = create<ReportsState>((set) => ({
  items: [],
  add: (r) => set((st) => ({ items: [r, ...st.items] })),
  set: (items) => set({ items }),
}))
