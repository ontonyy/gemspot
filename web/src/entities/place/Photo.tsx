import type { CSSProperties } from 'react'
import { type CategoryId, catColor, CategoryGlyph } from './categories'

/* riso-tinted photo placeholder — category-tinted hatch + faint glyph. */
export function Photo({ cat, label, className = '', glyph = true }:
  { cat: CategoryId; label?: string; className?: string; glyph?: boolean }) {
  return (
    <div className={'fg-photo ' + className} style={{ '--pc': catColor(cat) } as CSSProperties}>
      {glyph && <span className="fg-photo-glyph"><CategoryGlyph cat={cat} size={26} color={catColor(cat)} /></span>}
      {label && <span className="fg-photo-label">{label}</span>}
    </div>
  )
}
