import { RailCard } from './RailCard'
import { SkeletonList, EmptyState, ErrorState } from './RailStates'
import type { ExploreCard } from './useExploreList'
import { useGatedSave } from '../../shared/store/useGatedSave'

/* Scrolling specimen list shared by desktop rail + mobile sheet.
   Hover/select sync flows through `selected` slug + onHover/onSelect. */
interface RailListProps {
  items: ExploreCard[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  searching?: boolean
  selected?: string | null
  onHover?: (slug: string | null) => void
  onSelect?: (slug: string) => void
  onReset: () => void
}

export function RailList({
  items, loading, error, onRetry, searching, selected, onHover, onSelect, onReset,
}: RailListProps) {
  const save = useGatedSave()

  if (loading) return <SkeletonList />
  if (error && items.length === 0) return <ErrorState onRetry={onRetry} />
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
