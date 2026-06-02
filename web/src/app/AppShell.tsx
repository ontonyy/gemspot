import type { ReactNode } from 'react'
import { Icon, Ic } from '../shared/ui/Icon'
import { Button } from '../shared/ui/Button'
import { Avatar } from '../shared/ui/Avatar'
import { Toast } from '../shared/ui/Toast'
import { useToastStore } from '../shared/store/toastStore'

type Route = 'explore' | 'saved' | 'guides'

interface AppShellProps {
  route?: Route
  onNavigate?: (r: Route) => void
  savedCount?: number
  query?: string
  onQuery?: (v: string) => void
  onAdd?: () => void
  onBrand?: () => void
  children: ReactNode
}

const NAV: [Route, string][] = [
  ['explore', 'Explore'],
  ['saved', 'Saved'],
  ['guides', 'Guides'],
]

export function AppShell({
  route = 'explore', onNavigate, savedCount = 0,
  query = '', onQuery, onAdd, onBrand, children,
}: AppShellProps) {
  const toast = useToastStore((s) => s.message)
  return (
    <div className="fg-shell">
      <header className="fg-top">
        <button className="fg-brand" onClick={onBrand} aria-label="GemSpot — home">
          <div className="fg-logo" />
          <div>
            <div className="fg-wordmark">Gem<span>Spot</span></div>
            <small>Tallinn · Field Guide</small>
          </div>
        </button>
        <nav className="fg-nav">
          {NAV.map(([k, l]) => (
            <button key={k} data-on={route === k} onClick={() => onNavigate?.(k)}>
              {l}{k === 'saved' && savedCount > 0 && <span className="fg-navcount">{savedCount}</span>}
            </button>
          ))}
        </nav>
        <div className="fg-search">
          <span style={{ color: 'var(--ink-3)' }}><Icon d={Ic.search} size={16} /></span>
          <input value={query} onChange={(e) => onQuery?.(e.target.value)} placeholder="Search spots, areas…" />
        </div>
        <div className="fg-top-r">
          <Button variant="solid" onClick={onAdd}><Icon d={Ic.plus} size={16} sw={2} />Add a spot</Button>
          <Avatar initials="M" />
        </div>
      </header>
      <div className="fg-body">{children}</div>
      {toast && <Toast message={toast} />}
    </div>
  )
}
