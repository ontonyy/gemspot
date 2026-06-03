import { Chip } from '../../shared/ui/Chip'
import { FG_CATS, type CategoryId } from '../../entities/place/categories'

/* Legend / category filter. Single-select (URL ?cat=). "All" clears.
   compact = mobile floating chip row (horizontal scroll). */
interface LegendProps {
  active: CategoryId | null
  onSelect: (cat: CategoryId | null) => void
  compact?: boolean
  /** show the "All" clear-filter chip. Off in the add-spot form (category required). */
  allowAll?: boolean
}

export function Legend({ active, onSelect, compact, allowAll = true }: LegendProps) {
  return (
    <div className={compact ? 'fg-m-keys' : 'fg-keys'}>
      {allowAll && <Chip label="All" on={active === null} onClick={() => onSelect(null)} />}
      {FG_CATS.map((c) => (
        <Chip
          key={c.id}
          cat={c.id}
          label={c.short}
          on={active === c.id}
          onClick={() => onSelect(active === c.id ? null : c.id)}
        />
      ))}
    </div>
  )
}
