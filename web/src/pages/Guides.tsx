import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import { SkeletonList, ErrorState } from '../features/explore/RailStates'
import { useGuides } from '../shared/api/queries'
import { usePageTitle } from '../shared/lib/pageTitle'
import { pluralize } from '../shared/lib/pluralize'
import { catColor, CategoryGlyph } from '../entities/place/categories'
import { Ic, Icon } from '../shared/ui/Icon'

/* Guides — curated collections derived from the place set (no CMS). Each card
   opens a GuideDetail list. Cover accent + glyph driven by coverCategory. */
export default function Guides() {
  const navigate = useNavigate()
  const { data: guides, isLoading, isError, refetch } = useGuides()
  usePageTitle('Guides')

  return (
    <AppShell>
      <div className="fg-page">
        <div className="fg-page-in">
          <div className="fg-page-h">
            <div>
              <span className="kicker">Curated collections</span>
              <h1>Guides</h1>
              <div className="sub">Hand-picked routes through the field guide — by sport, by season, by access.</div>
            </div>
            <div className="sub mono">{pluralize(guides?.length ?? 0, 'guide')}</div>
          </div>

          {isLoading ? (
            <SkeletonList />
          ) : isError && !guides?.length ? (
            <ErrorState onRetry={() => { void refetch() }} />
          ) : (
            <div className="fg-guides">
              {guides?.map((g) => (
                <button
                  key={g.id}
                  className="fg-guide"
                  style={{ '--cc': catColor(g.coverCategory) } as CSSProperties}
                  onClick={() => navigate(`/guides/${g.id}`)}
                >
                  <div className="fg-guide-cover" style={{ background: catColor(g.coverCategory), color: '#fff' }}>
                    {g.coverImage ? (
                      <img src={g.coverImage} alt="" className="fg-guide-cover-img" />
                    ) : g.coverIcon && Ic[g.coverIcon] ? (
                      <Icon d={Ic[g.coverIcon]} size={34} />
                    ) : (
                      <CategoryGlyph cat={g.coverCategory} size={34} />
                    )}
                  </div>
                  <div className="fg-guide-body">
                    <h3>{g.title}</h3>
                    <div className="sub">{g.subtitle}</div>
                    <div className="fg-guide-count">{pluralize(g.count, 'spot')}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
