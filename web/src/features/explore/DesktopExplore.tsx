import { SpotMap } from '../../widgets/map/SpotMap'
import { Legend } from './Legend'
import { RailList } from './RailList'
import { SpotDetail } from '../place-detail/SpotDetail'
import { Icon, Ic } from '../../shared/ui/Icon'
import { FG_CAT, type CategoryId } from '../../entities/place/categories'
import type { ExploreCard } from './useExploreList'

interface DesktopExploreProps {
  items: ExploreCard[]
  loading?: boolean
  searching?: boolean
  cat: CategoryId | null
  onCat: (cat: CategoryId | null) => void
  free: boolean
  onFree: (next: boolean) => void
  curated?: boolean
  hover: string | null
  selected: string | null
  onHover: (slug: string | null) => void
  onSelect: (slug: string) => void
  detailSlug: string | null
  onCloseDetail: () => void
  onReset: () => void
  onEnableLocation?: () => void
  locating?: boolean
}

export function DesktopExplore(s: DesktopExploreProps) {
  const mapSel = s.selected ?? s.hover
  return (
    <div className="fg-explore">
      <div className="fg-rail">
        <div className="fg-legend">
          <div className="fg-legend-h">
            <span className="kicker">Legend · filter</span>
            {(s.cat || s.free) && <button className="fg-sort" onClick={s.onReset}>Clear</button>}
          </div>
          <Legend active={s.cat} onSelect={s.onCat} />
          <button className="fg-freetoggle" data-on={s.free} onClick={() => s.onFree(!s.free)}
            aria-pressed={s.free}>
            <span className="fg-freetoggle-box"><Icon d={Ic.check} size={11} sw={3} /></span>
            Free to play only
          </button>
        </div>

        {s.curated && (
          <button className="fg-geobanner" onClick={s.onEnableLocation} disabled={s.locating}
            aria-label="Use my location for distances">
            <Icon d={Ic.loc} size={13} />
            {s.locating
              ? 'Locating…'
              : <>Location off · distances from Tallinn centre<span className="fg-geobanner-cta">Use my location</span></>}
          </button>
        )}

        <div className="fg-rail-head">
          <div>
            <div className="count"><b className="mono">{s.items.length}</b> spots nearby</div>
            <div className="sub">
              {s.cat ? FG_CAT[s.cat].short : 'All categories'}{s.free ? ' · free only' : ''} · sorted by distance
            </div>
          </div>
          <button className="fg-sort"><Icon d={Ic.sort} size={13} />Near</button>
        </div>

        <div className="fg-rail-list">
          <RailList
            items={s.items}
            loading={s.loading}
            searching={s.searching}
            selected={mapSel}
            onHover={s.onHover}
            onSelect={s.onSelect}
            onReset={s.onReset}
          />
        </div>
      </div>

      {s.detailSlug && (
        <SpotDetail slug={s.detailSlug} onClose={s.onCloseDetail} />
      )}

      <div className="fg-mapwrap">
        {s.loading && <div className="fg-maploading"><span className="fg-pulse" />Loading Tallinn…</div>}
        <SpotMap items={s.items} selectedSlug={mapSel} onSelect={s.onSelect} />
      </div>
    </div>
  )
}
