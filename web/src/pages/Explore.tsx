import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import { DesktopExplore } from '../features/explore/DesktopExplore'
import { MobileExplore } from '../features/explore/MobileExplore'
import { useExploreList } from '../features/explore/useExploreList'
import { FG_CAT, type CategoryId } from '../entities/place/categories'
import { useIsMobile } from '../shared/lib/useViewport'
import { useUiStore } from '../shared/store/uiStore'
import { useGeoStore } from '../shared/store/geoStore'
import { track } from '../shared/api/track'

/* Explore screen — URL-driven (?cat= filter). Rail + map on desktop, full-bleed
   map + bottom sheet on mobile. Single source of list = useExploreList. */
export default function Explore() {
  const [params, setParams] = useSearchParams()
  const rawCat = params.get('cat')
  const cat: CategoryId | null = rawCat && rawCat in FG_CAT ? (rawCat as CategoryId) : null
  const free = params.get('free') === '1'

  // detail panel driven by /spot/:slug route param
  const navigate = useNavigate()
  const { slug: detailSlug } = useParams<{ slug: string }>()
  // ?focus= opens Explore centered on a spot (e.g. "Open in full map" from a
  // detail). Detail-open focus takes priority; the query param is the cold-open
  // path. One-shot: stripped from the search we propagate so it never sticks to
  // spot links.
  const focusSlug = detailSlug ?? params.get('focus')
  const navParams = new URLSearchParams(params)
  navParams.delete('focus')
  const search = navParams.toString()
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

  const { items, isLoading, isError, refetch } = useExploreList({ cat, query: searchQuery, free })

  const [hover, setHover] = useState<string | null>(null)

  const searching = searchQuery.trim().length > 0
  const curated = isCurated && geoStatus !== 'locating'

  const setCat = (next: CategoryId | null) => {
    if (next) track('filter', { axis: 'category', value: next })
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

  const setFree = (next: boolean) => {
    if (next) track('filter', { axis: 'free', value: true })
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next) p.set('free', '1')
        else p.delete('free')
        return p
      },
      { replace: true },
    )
  }

  const resetFilters = () => {
    if (searching) setSearchQuery('')
    else { setCat(null); setFree(false) }
  }

  return (
    <AppShell>
      {isMobile ? (
        <MobileExplore
          items={items}
          loading={isLoading}
          error={isError}
          onRetry={() => { void refetch() }}
          searching={searching}
          cat={cat}
          onCat={setCat}
          free={free}
          onFree={setFree}
          selected={detailSlug ?? hover}
          onSelect={openSpot}
          detailSlug={detailSlug ?? null}
          focusSlug={focusSlug}
          onCloseDetail={closeSpot}
          onReset={resetFilters}
          curated={curated}
          onEnableLocation={requestGeo}
          locating={geoStatus === 'locating'}
        />
      ) : (
        <DesktopExplore
          items={items}
          loading={isLoading}
          error={isError}
          onRetry={() => { void refetch() }}
          searching={searching}
          cat={cat}
          onCat={setCat}
          free={free}
          onFree={setFree}
          curated={curated}
          hover={hover}
          selected={detailSlug ?? hover}
          onHover={setHover}
          onSelect={openSpot}
          detailSlug={detailSlug ?? null}
          focusSlug={focusSlug}
          onCloseDetail={closeSpot}
          onReset={resetFilters}
          onEnableLocation={requestGeo}
          locating={geoStatus === 'locating'}
        />
      )}
    </AppShell>
  )
}
