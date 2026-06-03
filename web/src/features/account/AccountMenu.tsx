import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, Ic } from '../../shared/ui/Icon'
import { Avatar } from '../../shared/ui/Avatar'
import { useUiStore } from '../../shared/store/uiStore'
import { useSavedStore } from '../../shared/store/savedStore'
import { useSubmissionsStore } from '../../shared/store/submissionsStore'
import { useReportsStore } from '../../shared/store/reportsStore'
import { useAuthStore } from '../../shared/store/authStore'
import { useToastStore } from '../../shared/store/toastStore'
import { clearMine } from '../../shared/api/hydrateMine'
import { FG_CAT } from '../../entities/place/categories'
import type { CategoryId } from '../../entities/place/categories'
import type { ReportReason } from '../../shared/api/types'

const REPORT_REASON: Record<ReportReason, string> = {
  closed: 'Closed / gone',
  'wrong-location': 'Wrong location',
  'not-free': 'No longer free',
  other: 'Something else',
}

/* Client-only account menu (no auth server). Opened from the desktop avatar
   and the mobile "You" tab via uiStore.accountOpen. Lists the user's session
   submissions (PENDING, from submissionsStore) and a Saved shortcut. Scrim +
   Esc close. "Sign in" is a disabled placeholder — real auth is out of scope. */
const catName = (id: CategoryId) => FG_CAT[id]?.label ?? id

export function AccountMenu() {
  const close = useUiStore((s) => s.closeAccount)
  const navigate = useNavigate()
  const savedCount = useSavedStore((s) => s.ids.length)
  const subs = useSubmissionsStore((s) => s.items)
  const reports = useReportsStore((s) => s.items)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const showToast = useToastStore((s) => s.show)
  const [showSubs, setShowSubs] = useState(false)
  const [showReports, setShowReports] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const go = (to: string) => {
    close()
    navigate(to)
  }

  return (
    <>
      <div className="fg-acct-scrim" onClick={close} />
      <div className="fg-acct" role="menu" aria-label="Account">
        <div className="fg-acct-head">
          <Avatar initials={(user?.name ?? user?.email ?? 'M').slice(0, 1).toUpperCase()} />
          <div>
            <div className="n">{user ? (user.name ?? user.email) : 'You'}</div>
            <div className="s">{user ? user.email : 'Guest · browsing'}</div>
          </div>
        </div>

        <button className="fg-acct-item" onClick={() => setShowSubs((v) => !v)}>
          <Icon d={Ic.pin} size={16} />
          My submissions
          <span className="c">{subs.length}</span>
        </button>
        {showSubs &&
          (subs.length === 0 ? (
            <div className="fg-acct-item" style={{ cursor: 'default', color: 'var(--ink-3)', fontSize: 12.5 }}>
              No spots submitted yet
            </div>
          ) : (
            subs.map((s) => (
              <div key={s.id} className="fg-acct-item" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{s.name}</span>
                <span className="s" style={{ fontSize: 10 }}>
                  {catName(s.categoryId)} · {s.status} · {s.submittedAt}
                </span>
              </div>
            ))
          ))}

        <button className="fg-acct-item" onClick={() => setShowReports((v) => !v)}>
          <Icon d={Ic.flag} size={16} />
          My reports
          <span className="c">{reports.length}</span>
        </button>
        {showReports &&
          (reports.length === 0 ? (
            <div className="fg-acct-item" style={{ cursor: 'default', color: 'var(--ink-3)', fontSize: 12.5 }}>
              No problems reported yet
            </div>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="fg-acct-item" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{r.placeName}</span>
                <span className="s" style={{ fontSize: 10 }}>
                  {REPORT_REASON[r.reason]} · {r.status} · {r.reportedAt}
                </span>
              </div>
            ))
          ))}

        <button className="fg-acct-item" onClick={() => go('/saved')}>
          <Icon d={Ic.flag} size={16} />
          Saved
          <span className="c">{savedCount}</span>
        </button>

        {user ? (
          <button className="fg-acct-item" onClick={() => { logout(); clearMine(); showToast('Signed out'); close() }}>
            <Icon d={Ic.user} size={16} />
            Sign out
          </button>
        ) : (
          <button className="fg-acct-item" onClick={() => go('/auth')}>
            <Icon d={Ic.user} size={16} />
            Sign in
          </button>
        )}
      </div>
    </>
  )
}
