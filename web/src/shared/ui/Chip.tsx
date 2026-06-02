import type { CSSProperties } from 'react'
import { type CategoryId, catColor, CategoryGlyph } from '../../entities/place/categories'

/* category chip — glyph circle + label + [data-on]. Used in legend / filters.
   Plain "All" variant (no category) renders the mono pill. */
interface ChipProps {
  cat?: CategoryId
  label: string
  on?: boolean
  onClick?: () => void
}

export function Chip({ cat, label, on, onClick }: ChipProps) {
  if (!cat) {
    return (
      <button className="fg-key fg-key-all" data-on={on} onClick={onClick}>{label}</button>
    )
  }
  return (
    <button
      className="fg-key"
      data-on={on}
      style={{ '--kc': catColor(cat) } as CSSProperties}
      onClick={onClick}
    >
      <span className="fg-key-glyph"><CategoryGlyph cat={cat} size={11} /></span>
      {label}
    </button>
  )
}
