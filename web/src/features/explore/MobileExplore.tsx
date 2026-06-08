import { useRef, useState } from 'react'
import { SpotMap } from '../../widgets/map/SpotMap'
import { Legend } from './Legend'
import { RailList } from './RailList'
import { SpotDetail } from '../place-detail/SpotDetail'
import { Icon, Ic } from '../../shared/ui/Icon'
import type { CategoryId } from '../../entities/place/categories'
import type { ExploreCard } from './useExploreList'

type SheetState = 'peek' | 'half' | 'full'

interface MobileExploreProps {
  items: ExploreCard[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  searching?: boolean
  cat: CategoryId | null
  onCat: (cat: CategoryId | null) => void
  free: boolean
  onFree: (next: boolean) => void
  selected: string | null
  onSelect: (slug: string) => void
  detailSlug: string | null
  /** Slug the map should fly to + isolate. Detail-open or ?focus= cold-open. */
  focusSlug: string | null
  onCloseDetail: () => void
  onReset: () => void
  curated?: boolean
  onEnableLocation?: () => void
  locating?: boolean
}

export function MobileExplore(s: MobileExploreProps) {
  const [sheet, setSheet] = useState<SheetState>('half')
  const [dragH, setDragH] = useState<number | null>(null)
  const dragging = useRef<{ startY: number; startH: number } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const snapHeights = (): Record<SheetState, number> => {
    const h = stageRef.current?.clientHeight ?? window.innerHeight
    return { peek: 128, half: h * 0.5, full: h * 0.9 }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const heights = snapHeights()
    dragging.current = { startY: e.clientY, startH: heights[sheet] }
    setDragH(heights[sheet])
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const stageH = stageRef.current?.clientHeight ?? window.innerHeight
    const next = dragging.current.startH + (dragging.current.startY - e.clientY)
    setDragH(Math.max(96, Math.min(next, stageH * 0.92)))
  }
  const onPointerUp = () => {
    if (!dragging.current || dragH === null) { dragging.current = null; return }
    const heights = snapHeights()
    // snap to nearest defined state
    const nearest = (['peek', 'half', 'full'] as SheetState[]).reduce((best, st) =>
      Math.abs(heights[st] - dragH) < Math.abs(heights[best] - dragH) ? st : best, 'half')
    setSheet(nearest)
    setDragH(null)
    dragging.current = null
  }

  return (
    <div className="fg-explore-m">
      <div className="fg-m-stage" ref={stageRef}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <SpotMap items={s.items} selectedSlug={s.selected} focusSlug={s.focusSlug} onSelect={s.onSelect} />
        </div>

        <div className="fg-m-legend">
          <button className="fg-key fg-key-all fg-freekey" data-on={s.free}
            onClick={() => s.onFree(!s.free)} aria-pressed={s.free}>Free</button>
          <Legend active={s.cat} onSelect={s.onCat} compact />
        </div>

        <div
          className="fg-sheet"
          data-state={sheet}
          data-dragging={dragH !== null}
          style={dragH !== null ? { height: dragH } : undefined}
        >
          <div
            className="fg-sheet-grab"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={() => dragH === null && setSheet(sheet === 'full' ? 'half' : sheet === 'half' ? 'peek' : 'full')}
          >
            <span />
          </div>
          <div className="fg-sheet-head">
            <div>
              <div className="count" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
                <b className="mono">{s.items.length}</b> {s.curated ? 'spots in view' : 'spots nearby'}
              </div>
              <div className="sub kicker" style={{ marginTop: 3 }}>Sorted by distance</div>
            </div>
            <button className="fg-sort" onClick={s.onEnableLocation} disabled={s.locating}
              aria-label="Sort by distance from my location">
              <Icon d={Ic.sort} size={13} />{s.locating ? 'Getting location…' : 'Near'}
            </button>
          </div>
          <div className="fg-rail-list">
            <RailList
              items={s.items}
              loading={s.loading}
              error={s.error}
              onRetry={s.onRetry}
              searching={s.searching}
              selected={s.selected}
              onSelect={s.onSelect}
              onReset={s.onReset}
            />
          </div>
        </div>

        {s.detailSlug && (
          <SpotDetail slug={s.detailSlug} mobile onClose={s.onCloseDetail} />
        )}
      </div>
    </div>
  )
}
