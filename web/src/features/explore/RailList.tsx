import { RailCard } from './RailCard'
import { SkeletonList, EmptyState } from './RailStates'
import type { ExploreCard } from './useExploreList'
import { useGatedSave } from '../../shared/store/useGatedSave'

/* Scrolling specimen list shared by desktop rail + mobile sheet.
   Hover/select sync flows through `selected` slug + onHover/onSelect. */
interface RailListProps {
  items: ExploreCard[]
  loading?: boolean
  searching?: boolean
  selected?: string | null
  onHover?: (slug: string | null) => void
  onSelect?: (slug: string) => void
  onReset: () => void
}

export function RailList({
  items, loading, searching, selected, onHover, onSelect, onReset,
}: RailListProps) {
  const save = useGatedSave()

  if (loading) return <SkeletonList />
  if (items.length === 0) return <EmptyState searching={searching} onReset={onReset} />

  return (
    <div>
      {items.map((p) => (
        <RailCard
          key={p.slug}
          p={p}
          no={p.id}
          active={p.slug === selected}
          onHover={onHover}
          onOpen={() => onSelect?.(p.slug)}
          onSave={() => save(p.id)}
        />
      ))}
    </div>
  )
}
