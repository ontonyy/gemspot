import type { CSSProperties } from 'react'
import { catColor, CategoryGlyph } from '../../entities/place/categories'
import { Photo } from '../../entities/place/Photo'
import { SaveButton } from '../../shared/ui/SaveButton'
import { Tag } from '../../shared/ui/Tag'
import type { ExploreCard } from './useExploreList'

/* Specimen row for the Explore rail. Slug-keyed (matches map markers) so
   hover/select sync flows card↔pin. fg.css .fg-card spec. */
interface RailCardProps {
  p: ExploreCard
  no: string
  active?: boolean
  onSave?: () => void
  onOpen?: () => void
  onHover?: (slug: string | null) => void
}

export function RailCard({ p, no, active, onSave, onOpen, onHover }: RailCardProps) {
  const cat = p.category.id
  return (
    <div
      className="fg-card"
      data-active={active}
      style={{ '--cc': catColor(cat) } as CSSProperties}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen?.() }}
      onMouseEnter={() => onHover?.(p.slug)}
      onMouseLeave={() => onHover?.(null)}
    >
      <span className="fg-card-no">№{no}</span>
      <div className="fg-thumb">
        <Photo cat={cat} glyph />
        <span className="fg-thumb-cat" style={{ background: catColor(cat) }}>
          <CategoryGlyph cat={cat} size={11} />
        </span>
      </div>
      <div className="fg-card-body">
        <h3>{p.name}</h3>
        <div className="fg-card-meta">
          <span className="cat">{p.category.short}</span>
          <span className="dot" /><span>{p.neighborhood}</span>
          <span className="dot" /><span>{p.distanceKm.toFixed(1)}km</span>
        </div>
        <div className="fg-tags">
          {p.tags.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}
        </div>
      </div>
      <div className="fg-card-save"><SaveButton saved={p.isSaved} onClick={onSave} /></div>
    </div>
  )
}
