import { Icon, Ic } from '../../shared/ui/Icon'

/* Loading skeleton rows for the rail list (fg.css .fg-skel-row). */
export function SkeletonList() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="fg-skel-row" key={i}>
          <span className="fg-skel" style={{ width: 18, height: 11 }} />
          <span className="fg-skel" style={{ width: 64, height: 64 }} />
          <div className="b">
            <span className="fg-skel" style={{ width: '62%', height: 14 }} />
            <span className="fg-skel" style={{ width: '82%', height: 10 }} />
            <span className="fg-skel" style={{ width: 100, height: 16 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* Error state — backend unreachable and even the mock fallback failed. Retry
   refetches the underlying query. Reuses fg-empty atoms (no new colors/fonts). */
export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="fg-empty">
      <div className="fg-empty-mark">
        <span style={{ color: 'var(--ink-3)' }}><Icon d={Ic.flag} size={22} /></span>
      </div>
      <div className="kicker">Couldn't load</div>
      <h3>Something went wrong</h3>
      <p>We couldn't reach the field guide just now. Check your connection and try again.</p>
      {onRetry && <div className="fg-empty-btns"><button className="fg-btn" onClick={onRetry}>Retry</button></div>}
    </div>
  )
}

/* Empty state — two variants: no category match vs no search match. */
export function EmptyState({ searching, onReset }: { searching?: boolean; onReset: () => void }) {
  return (
    <div className="fg-empty">
      <div className="fg-empty-mark">
        <span style={{ color: 'var(--ink-3)' }}><Icon d={Ic.pin} size={22} /></span>
      </div>
      <div className="kicker">No specimens found</div>
      {searching ? (
        <>
          <h3>Nothing matches your search</h3>
          <p>No spots match that name, area or tag. Try a shorter query or clear the search.</p>
          <div className="fg-empty-btns"><button className="fg-btn" onClick={onReset}>Clear search</button></div>
        </>
      ) : (
        <>
          <h3>Nothing matches this filter</h3>
          <p>No spots in the current category fall inside the map view. Try widening the legend.</p>
          <div className="fg-empty-btns"><button className="fg-btn" onClick={onReset}>Reset legend</button></div>
        </>
      )}
    </div>
  )
}
