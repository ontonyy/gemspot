import type { ReactNode } from 'react'

/* GemSpot taxonomy — 7 launch categories. Color = taxonomy only.
   5 ported from fg-data.jsx FG_GLYPHS + 2 new (tennis, padel). */

export type CategoryId =
  | 'tabletennis' | 'basketball' | 'football'
  | 'tennis' | 'padel' | 'scenic' | 'sakura'

export interface Category {
  id: CategoryId
  label: string
  short: string
  cssvar: string
}

// white-on-color glyphs, 24×24 viewBox
export const FG_GLYPHS: Record<CategoryId, ReactNode> = {
  tabletennis: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="9" r="5.2" fill="currentColor" stroke="none" />
      <path d="M13.3 12.4l3.9 4.1" />
      <circle cx="17.5" cy="16.8" r="1.5" fill="currentColor" stroke="none" />
    </g>
  ),
  basketball: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <circle cx="12" cy="12" r="7.3" />
      <path d="M12 4.7v14.6M4.7 12h14.6" />
      <path d="M6.8 6.8C9 9 9 15 6.8 17.2M17.2 6.8C15 9 15 15 17.2 17.2" />
    </g>
  ),
  football: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="7.3" />
      <path d="M12 8.3l3.2 2.3-1.2 3.8h-4l-1.2-3.8z" fill="currentColor" stroke="none" />
      <path d="M12 4.7v3.6M15.2 10.6l3-1M13.6 14.4l1.9 2.9M10.4 14.4l-1.9 2.9M8.8 10.6l-3-1" />
    </g>
  ),
  // new — tennis racket (oval head + handle + cross strings)
  tennis: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="8.6" rx="5.2" ry="6" />
      <path d="M10.4 14.1L9 20.6" />
      <path d="M12 3.4v10.2M7.2 8.6h9.6" strokeWidth="1.1" />
    </g>
  ),
  // new — padel racket (solid teardrop head with perforation holes + handle)
  padel: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.4c3.6 0 6 2.6 6 5.8 0 3.3-2.4 5.8-6 5.8s-6-2.5-6-5.8c0-3.2 2.4-5.8 6-5.8z" />
      <path d="M10.5 14.9L9 20.6" />
      <circle cx="10" cy="8" r="0.95" fill="currentColor" stroke="none" />
      <circle cx="14" cy="8" r="0.95" fill="currentColor" stroke="none" />
      <circle cx="12" cy="11" r="0.95" fill="currentColor" stroke="none" />
    </g>
  ),
  scenic: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16.6" cy="7.4" r="2.1" fill="currentColor" stroke="none" />
      <path d="M3.6 18.4l4.3-5.9 3 3.5 3-4.3 6.5 6.7z" fill="currentColor" stroke="none" />
    </g>
  ),
  sakura: (
    <g fill="currentColor" stroke="none">
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="12" cy="6.6" rx="2.4" ry="3.5" transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="1.8" fill="rgba(255,255,255,.92)" />
    </g>
  ),
}

export const FG_CATS: Category[] = [
  { id: 'tabletennis', label: 'Table tennis', short: 'Ping pong', cssvar: '--c-tabletennis' },
  { id: 'basketball', label: 'Basketball', short: 'Hoops', cssvar: '--c-basketball' },
  { id: 'football', label: 'Football', short: 'Football', cssvar: '--c-football' },
  { id: 'tennis', label: 'Tennis', short: 'Tennis', cssvar: '--c-tennis' },
  { id: 'padel', label: 'Padel', short: 'Padel', cssvar: '--c-padel' },
  { id: 'scenic', label: 'Viewpoint', short: 'Views', cssvar: '--c-scenic' },
  { id: 'sakura', label: 'Sakura', short: 'Sakura', cssvar: '--c-sakura' },
]

export const FG_CAT: Record<CategoryId, Category> =
  Object.fromEntries(FG_CATS.map((c) => [c.id, c])) as Record<CategoryId, Category>

export const catColor = (id: CategoryId): string => `var(${FG_CAT[id].cssvar})`

export function CategoryGlyph({ cat, size = 16, color = '#fff' }:
  { cat: CategoryId; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color, display: 'block' }}>
      {FG_GLYPHS[cat]}
    </svg>
  )
}
