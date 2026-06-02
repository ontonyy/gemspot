import type { ReactNode } from 'react'

/* minimal line icons (stroke 1.6, consistent) — ported from fg-app.jsx Ic */
export const Ic: Record<string, ReactNode> = {
  search: <g><circle cx="11" cy="11" r="6.4" /><path d="M20 20l-3.8-3.8" /></g>,
  flag: <g><path d="M6 21V4M6 4h11l-2.2 4L17 12H6" /></g>,
  share: <g><path d="M12 14V4M12 4l-3.5 3.5M12 4l3.5 3.5" /><path d="M5 13v6a1 1 0 001 1h12a1 1 0 001-1v-6" /></g>,
  arrow: <g><path d="M5 12h13M13 6l6 6-6 6" /></g>,
  layers: <g><path d="M12 4l8 4-8 4-8-4 8-4z" /><path d="M4 12l8 4 8-4M4 16l8 4 8-4" /></g>,
  plus: <g><path d="M12 5v14M5 12h14" /></g>,
  minus: <g><path d="M5 12h14" /></g>,
  loc: <g><path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" /><circle cx="12" cy="10" r="2.4" /></g>,
  x: <g><path d="M6 6l12 12M18 6L6 18" /></g>,
  back: <g><path d="M19 12H5M11 6l-6 6 6 6" /></g>,
  sort: <g><path d="M7 5v14M7 19l-3-3M7 5l3 3M17 19V5M17 5l3 3M17 5l-3 3" /></g>,
  star: <g><path d="M12 4l2.3 4.7 5.2.8-3.8 3.7.9 5.1L12 16.7 7.4 18l.9-5.1-3.8-3.7 5.2-.8z" /></g>,
  pin: <g><path d="M12 21s6-5.5 6-10a6 6 0 10-12 0c0 4.5 6 10 6 10z" /><circle cx="12" cy="11" r="2" /></g>,
  book: <g><path d="M5 5a2 2 0 012-2h11v16H7a2 2 0 00-2 2V5z" /><path d="M5 19a2 2 0 012-2h11" /></g>,
  user: <g><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20c.6-3.5 3.2-5.4 6.5-5.4S17.9 16.5 18.5 20" /></g>,
  check: <g><path d="M5 12l5 5 9-11" /></g>,
  cog: <g><circle cx="12" cy="12" r="2.6" /><path d="M12 3.6v2.2M12 18.2v2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M3.6 12h2.2M18.2 12h2.2M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" /></g>,
  shield: <g><path d="M12 3.5l6.5 2.4v5.1c0 4-2.7 7.1-6.5 8.5-3.8-1.4-6.5-4.5-6.5-8.5V5.9L12 3.5z" /></g>,
  out: <g><path d="M14 7V5a1 1 0 00-1-1H6a1 1 0 00-1 1v14a1 1 0 001 1h7a1 1 0 001-1v-2" /><path d="M10 12h10M16 8l4 4-4 4" /></g>,
  chev: <g><path d="M6 9l6 6 6-6" /></g>,
}

export function Icon({ d, size = 18, sw = 1.6 }: { d: ReactNode; size?: number; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block' }}>{d}</svg>
  )
}
