import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, Ic } from '../../shared/ui/Icon'
import { Avatar } from '../../shared/ui/Avatar'
import { useUiStore } from '../../shared/store/uiStore'
import { useSavedStore } from '../../shared/store/savedStore'
import { useSubmissionsStore } from '../../shared/store/submissionsStore'
import { FG_CAT } from '../../entities/place/categories'
import type { CategoryId } from '../../entities/place/categories'

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
  const [showSubs, setShowSubs] = useState(false)

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
          <Avatar initials="M" />
          <div>
            <div className="n">You</div>
            <div className="s">Local explorer</div>
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

        <button className="fg-acct-item" onClick={() => go('/saved')}>
          <Icon d={Ic.flag} size={16} />
          Saved
          <span className="c">{savedCount}</span>
        </button>

        <button className="fg-acct-item" disabled>
          <Icon d={Ic.user} size={16} />
          Sign in
          <span className="c">soon</span>
        </button>
      </div>
    </>
  )
}
