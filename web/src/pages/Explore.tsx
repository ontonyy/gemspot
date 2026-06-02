import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import { DesktopExplore } from '../features/explore/DesktopExplore'
import { MobileExplore } from '../features/explore/MobileExplore'
import { useExploreList } from '../features/explore/useExploreList'
import { FG_CAT, type CategoryId } from '../entities/place/categories'
import { useIsMobile } from '../shared/lib/useViewport'
import { useUiStore } from '../shared/store/uiStore'
import { useGeoStore } from '../shared/store/geoStore'

/* Explore screen — URL-driven (?cat= filter). Rail + map on desktop, full-bleed
   map + bottom sheet on mobile. Single source of list = useExploreList. */
export default function Explore() {
  const [params, setParams] = useSearchParams()
  const rawCat = params.get('cat')
  const cat: CategoryId | null = rawCat && rawCat in FG_CAT ? (rawCat as CategoryId) : null

  // detail panel driven by /spot/:slug route param
  const navigate = useNavigate()
  const { slug: detailSlug } = useParams<{ slug: string }>()
  const search = params.toString()
  const openSpot = useCallback(
    (slug: string) => navigate(`/spot/${slug}${search ? `?${search}` : ''}`),
    [navigate, search],
  )
  const closeSpot = useCallback(
    () => navigate(`/explore${search ? `?${search}` : ''}`),
    [navigate, search],
  )

  const searchQuery = useUiStore((s) => s.searchQuery)
  const setSearchQuery = useUiStore((s) => s.setSearchQuery)

  const isMobile = useIsMobile()
  const requestGeo = useGeoStore((s) => s.request)
  const isCurated = useGeoStore((s) => s.isCurated)
  const geoStatus = useGeoStore((s) => s.status)
  useEffect(() => { requestGeo() }, [requestGeo])

  const { items, isLoading } = useExploreList({ cat, query: searchQuery })

  const [hover, setHover] = useState<string | null>(null)

  const savedCount = useMemo(() => items.filter((p) => p.isSaved).length, [items])
  const searching = searchQuery.trim().length > 0
  const curated = isCurated && geoStatus !== 'locating'

  const setCat = (next: CategoryId | null) => {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next) p.set('cat', next)
        else p.delete('cat')
        return p
      },
      { replace: true },
    )
  }

  const resetFilters = () => {
    if (searching) setSearchQuery('')
    else setCat(null)
  }

  return (
    <AppShell
      route="explore"
      savedCount={savedCount}
      query={searchQuery}
      onQuery={setSearchQuery}
      onBrand={() => setCat(null)}
      onNavigate={() => setCat(null)}
    >
      {isMobile ? (
        <MobileExplore
          items={items}
          loading={isLoading}
          searching={searching}
          cat={cat}
          onCat={setCat}
          selected={detailSlug ?? hover}
          onSelect={openSpot}
          detailSlug={detailSlug ?? null}
          onCloseDetail={closeSpot}
          onReset={resetFilters}
        />
      ) : (
        <DesktopExplore
          items={items}
          loading={isLoading}
          searching={searching}
          cat={cat}
          onCat={setCat}
          curated={curated}
          hover={hover}
          selected={detailSlug ?? hover}
          onHover={setHover}
          onSelect={openSpot}
          detailSlug={detailSlug ?? null}
          onCloseDetail={closeSpot}
          onReset={resetFilters}
        />
      )}
    </AppShell>
  )
}
