import { RailCard } from './RailCard'
import { SkeletonList, EmptyState } from './RailStates'
import type { ExploreCard } from './useExploreList'
import { useSavedStore } from '../../shared/store/savedStore'
import { useToastStore } from '../../shared/store/toastStore'

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
  const toggleSave = useSavedStore((s) => s.toggle)
  const showToast = useToastStore((s) => s.show)

  if (loading) return <SkeletonList />
  if (items.length === 0) return <EmptyState searching={searching} onReset={onReset} />

  return (
    <div>
      {items.map((p, i) => (
        <RailCard
          key={p.slug}
          p={p}
          no={String(i + 1).padStart(2, '0')}
          active={p.slug === selected}
          onHover={onHover}
          onOpen={() => onSelect?.(p.slug)}
          onSave={() => {
            const nowSaved = toggleSave(p.id)
            showToast(nowSaved ? 'Saved to your collection' : 'Removed from collection')
          }}
        />
      ))}
    </div>
  )
}
