import type { CSSProperties } from 'react'
import { type CategoryId, catColor, CategoryGlyph } from './categories'

/* photo placeholder — solid category accent fill + big centered white glyph.
   When `url` is set, renders the real image instead of the placeholder.
   `large` enlarges the glyph for the detail hero. */
export function Photo({ cat, label, className = '', glyph = true, url, large = false }:
  { cat: CategoryId; label?: string; className?: string; glyph?: boolean; url?: string; large?: boolean }) {
  if (url) {
    return <div className={'fg-photo ' + className} style={{ '--pc': catColor(cat) } as CSSProperties}>
      <img src={url} alt={label ?? ''} className="fg-photo-img" />
    </div>
  }
  return (
    <div className={'fg-photo ' + className} style={{ '--pc': catColor(cat) } as CSSProperties}>
      {glyph && <span className="fg-photo-glyph"><CategoryGlyph cat={cat} size={large ? 64 : 26} color="#fff" /></span>}
      {label && <span className="fg-photo-label">{label}</span>}
    </div>
  )
}
