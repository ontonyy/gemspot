import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import { RailCard } from '../features/explore/RailCard'
import { SkeletonList } from '../features/explore/RailStates'
import { useExploreList } from '../features/explore/useExploreList'
import { Icon, Ic } from '../shared/ui/Icon'
import { useGatedSave } from '../shared/store/useGatedSave'
import { useGeoStore } from '../shared/store/geoStore'

/* Saved specimens — everything bookmarked via savedStore (persisted to
   localStorage). Reuses the Explore RailCard; unsave removes the row live. */
export default function Saved() {
  const navigate = useNavigate()
  const requestGeo = useGeoStore((s) => s.request)
  useEffect(() => { requestGeo() }, [requestGeo])

  const { items, isLoading } = useExploreList()
  const save = useGatedSave()

  const saved = useMemo(() => items.filter((p) => p.isSaved), [items])

  return (
    <AppShell>
      <div className="fg-page">
        <div className="fg-page-in">
          <div className="fg-page-h">
            <div>
              <span className="kicker">Your field collection</span>
              <h1>Saved spots</h1>
            </div>
            <div className="sub mono">{saved.length} collected</div>
          </div>

          {isLoading ? (
            <SkeletonList />
          ) : saved.length === 0 ? (
            <div className="fg-empty">
              <div className="fg-empty-mark">
                <span style={{ color: 'var(--ink-3)' }}><Icon d={Ic.flag} size={22} /></span>
              </div>
              <div className="kicker">Nothing collected yet</div>
              <h3>No saved spots yet</h3>
              <p>Tap the stamp on any specimen to save it here. Your collection lives on this device.</p>
              <div className="fg-empty-btns">
                <button className="fg-btn" onClick={() => navigate('/explore')}>Explore spots</button>
              </div>
            </div>
          ) : (
            <div className="fg-page-grid">
              {saved.map((p) => (
                <RailCard
                  key={p.slug}
                  p={p}
                  no={p.id}
                  onOpen={() => navigate(`/spot/${p.slug}`)}
                  onSave={() => save(p.id, '/saved')}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
