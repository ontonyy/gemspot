import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../shared/store/authStore'

/* Admin shell — role-gated chrome SEPARATE from the consumer AppShell. Guests
   bounce to /auth, signed-in non-admins bounce to /explore. Sidebar + content
   slot; collapses to a horizontal tab bar on mobile (.fg-adm-nav). */
const LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/moderation', label: 'Moderation', end: false },
  { to: '/admin/places', label: 'Places', end: false },
  { to: '/admin/users', label: 'Users', end: false },
]

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  if (!user) return <Navigate to="/auth" state={{ from: '/admin' }} replace />
  if (user.role !== 'ADMIN') return <Navigate to="/explore" replace />

  return (
    <div className="fg-adm">
      <aside className="fg-adm-side">
        <div className="fg-adm-brand">GemSpot · Admin</div>
        <nav className="fg-adm-nav">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `fg-adm-link${isActive ? ' is-active' : ''}`}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="fg-adm-side-foot">
          <button className="fg-adm-linkbtn" onClick={() => navigate('/explore')}>
            ← Back to site
          </button>
          <button
            className="fg-adm-linkbtn"
            onClick={() => {
              logout()
              navigate('/auth')
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="fg-adm-main">
        <Outlet />
      </main>
    </div>
  )
}
