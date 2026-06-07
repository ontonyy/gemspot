import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Icon, Ic } from '../shared/ui/Icon'
import { Button } from '../shared/ui/Button'
import { Avatar } from '../shared/ui/Avatar'
import { Toast } from '../shared/ui/Toast'
import { CategoryGlyph, catColor } from '../entities/place/categories'
import { MobileNav } from '../widgets/nav/MobileNav'
import { AccountMenu } from '../features/account/AccountMenu'
import { useExploreList } from '../features/explore/useExploreList'
import { useGuides, useCategories } from '../shared/api/queries'
import { useToastStore } from '../shared/store/toastStore'
import { useUiStore } from '../shared/store/uiStore'
import { useSavedStore } from '../shared/store/savedStore'
import { useIsMobile } from '../shared/lib/useViewport'

/* App chrome shared by every screen: top bar (brand/nav/search/add/avatar) +
   mobile bottom nav. Self-navigating via the router — pages render only their
   body. Search + account-menu state live in uiStore so every page shares them. */
const NAV: [string, string][] = [
  ['/explore', 'Explore'],
  ['/saved', 'Saved'],
  ['/guides', 'Guides'],
]

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const toast = useToastStore((s) => s.message)
  const query = useUiStore((s) => s.searchQuery)
  const setQuery = useUiStore((s) => s.setSearchQuery)
  const toggleAccount = useUiStore((s) => s.toggleAccount)
  const accountOpen = useUiStore((s) => s.accountOpen)
  const savedCount = useSavedStore((s) => s.ids.length)
  const isMobile = useIsMobile()

  const active = (to: string) =>
    to === '/explore' ? pathname === '/explore' || pathname.startsWith('/spot/') : pathname.startsWith(to)

  return (
    <div className="fg-shell">
      <header className="fg-top">
        <button className="fg-brand" onClick={() => navigate('/')} aria-label="GemSpot — home">
          <div className="fg-logo" />
          <div>
            <div className="fg-wordmark">Gem<span>Spot</span></div>
            <small>Tallinn · Field Guide · v{__APP_VERSION__}</small>
          </div>
        </button>
        <nav className="fg-nav">
          {NAV.map(([to, l]) => (
            <button key={to} data-on={active(to)} onClick={() => navigate(to)}>
              {l}{to === '/saved' && savedCount > 0 && <span className="fg-navcount">{savedCount}</span>}
            </button>
          ))}
        </nav>
        <SearchBox query={query} setQuery={setQuery} />
        <div className="fg-top-r">
          <Button variant="solid" onClick={() => navigate('/add')}><Icon d={Ic.plus} size={16} sw={2} />Add a spot</Button>
          <Avatar initials="M" on={accountOpen} onClick={toggleAccount} aria-label="Account" />
        </div>
      </header>
      <div className="fg-body">{children}</div>
      {accountOpen && <AccountMenu />}
      {isMobile && <MobileNav />}
      {toast && <Toast message={toast} />}
    </div>
  )
}

/* Top-bar search. Writes `searchQuery` (filters the Explore rail) AND shows a
   global quick-jump dropdown across spots, guides and categories — click to
   jump to the spot, guide or filtered Explore view from any page. */
function SearchBox({ query, setQuery }: { query: string; setQuery: (q: string) => void }) {
  const navigate = useNavigate()
  const [focused, setFocused] = useState(false)
  const { items } = useExploreList({ query })
  const { data: guides } = useGuides()
  const { data: categories } = useCategories()
  const q = query.trim()
  const ql = q.toLowerCase()

  const spotHits = q ? items.slice(0, 6) : []
  const guideHits = q
    ? (guides ?? [])
        .filter((g) => g.title.toLowerCase().includes(ql) || g.subtitle.toLowerCase().includes(ql))
        .slice(0, 4)
    : []
  const catHits = q
    ? (categories ?? [])
        .filter((c) => c.label.toLowerCase().includes(ql) || c.short.toLowerCase().includes(ql))
        .slice(0, 4)
    : []

  const open = focused && q.length > 0
  const hasHits = spotHits.length + guideHits.length + catHits.length > 0

  const jump = (to: string) => {
    setFocused(false)
    setQuery('')
    navigate(to)
  }

  return (
    <div className="fg-search">
      <span style={{ color: 'var(--ink-3)' }}><Icon d={Ic.search} size={16} /></span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        placeholder="Search spots, guides, categories…"
      />
      {open && (
        <div className="fg-search-results" role="listbox">
          {!hasHits ? (
            <div className="fg-search-empty">Nothing matches “{q}”.</div>
          ) : (
            <>
              {spotHits.length > 0 && (
                <div className="kicker" style={{ padding: '8px 12px 4px' }}>Spots</div>
              )}
              {spotHits.map((p) => (
                <button key={p.slug} className="fg-search-row" role="option"
                  onMouseDown={(e) => e.preventDefault()} onClick={() => jump(`/spot/${p.slug}`)}>
                  <span className="fg-search-ic" style={{ background: catColor(p.category.id) }}>
                    <CategoryGlyph cat={p.category.id} size={12} />
                  </span>
                  <span className="fg-search-txt">
                    <b>{p.name}</b>
                    <small>{p.category.short} · {p.neighborhood}</small>
                  </span>
                </button>
              ))}

              {guideHits.length > 0 && (
                <div className="kicker" style={{ padding: '8px 12px 4px' }}>Guides</div>
              )}
              {guideHits.map((g) => (
                <button key={g.id} className="fg-search-row" role="option"
                  onMouseDown={(e) => e.preventDefault()} onClick={() => jump(`/guides/${g.id}`)}>
                  <span className="fg-search-ic" style={{ background: catColor(g.coverCategory) }}>
                    <CategoryGlyph cat={g.coverCategory} size={12} />
                  </span>
                  <span className="fg-search-txt">
                    <b>{g.title}</b>
                    <small>{g.count} spots · guide</small>
                  </span>
                </button>
              ))}

              {catHits.length > 0 && (
                <div className="kicker" style={{ padding: '8px 12px 4px' }}>Categories</div>
              )}
              {catHits.map((c) => (
                <button key={c.id} className="fg-search-row" role="option"
                  onMouseDown={(e) => e.preventDefault()} onClick={() => jump(`/explore?cat=${c.id}`)}>
                  <span className="fg-search-ic" style={{ background: catColor(c.id) }}>
                    <CategoryGlyph cat={c.id} size={12} />
                  </span>
                  <span className="fg-search-txt">
                    <b>{c.label}</b>
                    <small>Browse on the map</small>
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
