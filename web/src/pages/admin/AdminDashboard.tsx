import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, type AdminStats, type EventCount } from '../../shared/api/adminApi'
import { useAuthStore } from '../../shared/store/authStore'

/* Overview counts. Pending-submissions / open-reports double as a moderation
   to-do; click jumps to the queue. */
export default function AdminDashboard() {
  const token = useAuthStore((s) => s.accessToken)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [events, setEvents] = useState<EventCount[]>([])
  const [err, setErr] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) return
    adminApi.stats(token).then(setStats).catch((e: Error) => setErr(e.message))
    adminApi.eventCounts(token).then(setEvents).catch(() => undefined)
  }, [token])

  const cards: { label: string; value: number; hint?: string; go?: string }[] = stats
    ? [
        { label: 'Pending submissions', value: stats.pendingSubmissions, hint: 'awaiting review', go: '/admin/moderation' },
        { label: 'Open reports', value: stats.openReports, hint: 'flagged spots', go: '/admin/moderation' },
        { label: 'Active places', value: stats.activePlaces, hint: `of ${stats.places} total`, go: '/admin/places' },
        { label: 'Users', value: stats.users, hint: 'registered', go: '/admin/users' },
      ]
    : []

  return (
    <section>
      <h1 className="fg-adm-h1">Dashboard</h1>
      {err && <p className="fg-adm-err">{err}</p>}
      {!stats && !err && <p className="fg-adm-muted">Loading…</p>}
      <div className="fg-adm-cards">
        {cards.map((c) => (
          <button
            key={c.label}
            className="fg-adm-card"
            onClick={() => c.go && navigate(c.go)}
          >
            <span className="fg-adm-card-val">{c.value}</span>
            <span className="fg-adm-card-lbl">{c.label}</span>
            {c.hint && <span className="fg-adm-card-hint">{c.hint}</span>}
          </button>
        ))}
      </div>

      <h2 className="fg-adm-h2">Events</h2>
      {events.length === 0 ? (
        <p className="fg-adm-muted">No events tracked yet.</p>
      ) : (
        <div className="fg-adm-cards">
          {events.map((e) => (
            <div key={e.name} className="fg-adm-card" style={{ cursor: 'default' }}>
              <span className="fg-adm-card-val">{e.count}</span>
              <span className="fg-adm-card-lbl">{e.name}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
