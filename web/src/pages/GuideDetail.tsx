import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import { RailCard } from '../features/explore/RailCard'
import { SkeletonList } from '../features/explore/RailStates'
import { useExploreList } from '../features/explore/useExploreList'
import { useGuide } from '../shared/api/queries'
import { Icon, Ic } from '../shared/ui/Icon'
import { useGatedSave } from '../shared/store/useGatedSave'
import { useGeoStore } from '../shared/store/geoStore'

/* GuideDetail — the spots in one curated collection. Reuses the Explore
   RailCard (distance + save) by annotating the guide's slugs from the live
   Explore list, preserving the guide's curated order. */
export default function GuideDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const requestGeo = useGeoStore((s) => s.request)
  useEffect(() => { requestGeo() }, [requestGeo])

  const { data, isLoading: guideLoading } = useGuide(id ?? null)
  const { items, isLoading: listLoading } = useExploreList()
  const save = useGatedSave()

  const spots = useMemo(() => {
    if (!data) return []
    const order = new Map(data.guide.spotSlugs.map((s, i) => [s, i]))
    return items
      .filter((p) => order.has(p.slug))
      .sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0))
  }, [data, items])

  const isLoading = guideLoading || listLoading

  return (
    <AppShell>
      <div className="fg-page">
        <div className="fg-page-in">
          <button className="fg-backlink" onClick={() => navigate('/guides')}>
            <Icon d={Ic.back} size={14} sw={2} />All guides
          </button>
          <div className="fg-page-h">
            <div>
              <span className="kicker">Curated collection</span>
              <h1>{data?.guide.title ?? 'Guide'}</h1>
              {data && <div className="sub">{data.guide.subtitle}</div>}
            </div>
            <div className="sub mono">{spots.length} spots</div>
          </div>

          {isLoading ? (
            <SkeletonList />
          ) : (
            <div className="fg-page-grid">
              {spots.map((p) => (
                <RailCard
                  key={p.slug}
                  p={p}
                  no={p.id}
                  onOpen={() => navigate(`/spot/${p.slug}`)}
                  onSave={() => save(p.id, `/guides/${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
