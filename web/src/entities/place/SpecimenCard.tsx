import type { CSSProperties } from 'react'
import { catColor, CategoryGlyph, FG_CAT } from './categories'
import { Photo } from './Photo'
import type { PlaceCard } from './model'
import { SaveButton } from '../../shared/ui/SaveButton'
import { Tag } from '../../shared/ui/Tag'

interface SpecimenCardProps {
  p: PlaceCard
  saved?: boolean
  active?: boolean
  onSave?: () => void
  onOpen?: () => void
  onHover?: (id: number | null) => void
}

export function SpecimenCard({ p, saved, active, onSave, onOpen, onHover }: SpecimenCardProps) {
  return (
    <div
      className="fg-card"
      data-active={active}
      style={{ '--cc': catColor(p.cat) } as CSSProperties}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen?.() }}
      onMouseEnter={() => onHover?.(p.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <span className="fg-card-no">№{p.no}</span>
      <div className="fg-thumb">
        <Photo cat={p.cat} glyph />
        <span className="fg-thumb-cat" style={{ background: catColor(p.cat) }}>
          <CategoryGlyph cat={p.cat} size={11} />
        </span>
      </div>
      <div className="fg-card-body">
        <h3>{p.name}</h3>
        <div className="fg-card-meta">
          <span className="cat">{FG_CAT[p.cat].short}</span>
          <span className="dot" /><span>{p.area}</span>
          <span className="dot" /><span>{p.km.toFixed(1)}km</span>
        </div>
        <div className="fg-tags">
          {p.tags.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}
        </div>
      </div>
      <div className="fg-card-save"><SaveButton saved={saved} onClick={onSave} /></div>
    </div>
  )
}
