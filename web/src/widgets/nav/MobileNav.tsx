import { useLocation, useNavigate } from 'react-router-dom'
import { Icon, Ic } from '../../shared/ui/Icon'
import { useUiStore } from '../../shared/store/uiStore'

/* Mobile bottom nav — shared chrome across every screen. Center Add is a FAB.
   "You" opens the client-only account menu (no route). Active state from URL. */
type Item = { key: string; icon: typeof Ic.pin; label: string; to?: string; fab?: boolean; account?: boolean }

const ITEMS: Item[] = [
  { key: 'explore', icon: Ic.pin, label: 'Explore', to: '/explore' },
  { key: 'saved', icon: Ic.flag, label: 'Saved', to: '/saved' },
  { key: 'add', icon: Ic.plus, label: 'Add', to: '/add', fab: true },
  { key: 'guides', icon: Ic.book, label: 'Guides', to: '/guides' },
  { key: 'you', icon: Ic.user, label: 'You', account: true },
]

export function MobileNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const openAccount = useUiStore((s) => s.openAccount)
  const accountOpen = useUiStore((s) => s.accountOpen)

  const isActive = (it: Item) => {
    if (it.account) return accountOpen
    if (it.to === '/explore') return pathname === '/explore' || pathname.startsWith('/spot/')
    return it.to ? pathname.startsWith(it.to) : false
  }

  return (
    <nav className="fg-mobnav">
      {ITEMS.map((it) => (
        <button
          key={it.key}
          data-on={isActive(it)}
          onClick={() => (it.account ? openAccount() : it.to && navigate(it.to))}
        >
          <span className={`fg-mobnav-ic${it.fab ? ' fg-mobnav-fab' : ''}`}
            style={it.fab ? { width: 38, height: 32, marginTop: -2 } : undefined}>
            <Icon d={it.icon} size={it.fab ? 18 : 19} sw={it.fab ? 2 : 1.6} />
          </span>
          {it.label}
        </button>
      ))}
    </nav>
  )
}
