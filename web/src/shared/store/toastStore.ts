/* Transient toast — one message at a time, auto-dismiss. */

import { create } from 'zustand'

interface ToastState {
  message: string | null
  show: (message: string, ms?: number) => void
  hide: () => void
}

let timer: ReturnType<typeof setTimeout> | null = null

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message, ms = 2200) => {
    if (timer) clearTimeout(timer)
    set({ message })
    timer = setTimeout(() => set({ message: null }), ms)
  },
  hide: () => {
    if (timer) clearTimeout(timer)
    set({ message: null })
  },
}))
