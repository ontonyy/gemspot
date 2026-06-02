import { useEffect, useState } from 'react'
import { AppShell } from '../app/AppShell'
import { SpotMap } from '../widgets/map/SpotMap'
import { useExploreList } from '../features/explore/useExploreList'
import { useGeoStore } from '../shared/store/geoStore'

/* Block-4 visual check: real MapLibre + OpenFreeMap basemap (fg monochrome),
   branded pins + clustering, fed by the live Explore list. */
export default function MapDemo() {
  const { items, isLoading } = useExploreList()
  const [selected, setSelected] = useState<string | null>(null)
  const requestGeo = useGeoStore((s) => s.request)

  useEffect(() => {
    requestGeo()
  }, [requestGeo])

  return (
    <AppShell route="explore" savedCount={items.filter((p) => p.isSaved).length}>
      <div style={{ position: 'relative', height: 'calc(100vh - var(--topbar))' }}>
        {isLoading && (
          <div className="fg-maploading" style={{ position: 'absolute', zIndex: 5, left: 16, top: 16 }}>
            Loading Tallinn…
          </div>
        )}
        <SpotMap items={items} selectedSlug={selected} onSelect={setSelected} />
      </div>
    </AppShell>
  )
}
