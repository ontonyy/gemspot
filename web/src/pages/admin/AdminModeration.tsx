import { useCallback, useEffect, useState } from 'react'
import {
  adminApi,
  type AdminReport,
  type AdminSubmission,
  type AdminSubmissionStatus,
} from '../../shared/api/adminApi'
import { useAuthStore } from '../../shared/store/authStore'
import { CategoryGlyph, FG_CAT, catColor } from '../../entities/place/categories'

const SUB_TABS: AdminSubmissionStatus[] = ['PENDING', 'APPROVED', 'REJECTED']

/* Moderation queue. Submissions (approve → publishes an ACTIVE place that shows
   on the public map; reject → marks REJECTED) + reports (resolve/dismiss). Row
   click opens a detail drawer. */
export default function AdminModeration() {
  const token = useAuthStore((s) => s.accessToken)!
  const [tab, setTab] = useState<AdminSubmissionStatus>('PENDING')
  const [subs, setSubs] = useState<AdminSubmission[]>([])
  const [reports, setReports] = useState<AdminReport[]>([])
  const [active, setActive] = useState<AdminSubmission | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(() => {
    adminApi.listSubmissions(token, tab).then(setSubs).catch(() => undefined)
    adminApi.listReports(token, 'OPEN').then(setReports).catch(() => undefined)
  }, [token, tab])

  useEffect(() => {
    load()
  }, [load])

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(null), 2600)
  }

  const approve = async (s: AdminSubmission) => {
    setBusy(true)
    try {
      const r = await adminApi.approveSubmission(token, s.id)
      flash(`Approved — published as /spot/${r.placeSlug}`)
      setActive(null)
      load()
    } catch (e) {
      flash((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const reject = async (s: AdminSubmission) => {
    setBusy(true)
    try {
      await adminApi.rejectSubmission(token, s.id)
      flash('Submission rejected')
      setActive(null)
      load()
    } catch (e) {
      flash((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const resolveReport = async (r: AdminReport, status: 'RESOLVED' | 'DISMISSED') => {
    try {
      await adminApi.setReportStatus(token, r.id, status)
      flash(status === 'RESOLVED' ? 'Report resolved' : 'Report dismissed')
      load()
    } catch (e) {
      flash((e as Error).message)
    }
  }

  return (
    <section>
      <h1 className="fg-adm-h1">Moderation</h1>
      {msg && <div className="fg-adm-flash">{msg}</div>}

      <h2 className="fg-adm-h2">Submissions</h2>
      <div className="fg-adm-tabs">
        {SUB_TABS.map((t) => (
          <button
            key={t}
            className={`fg-adm-tab${tab === t ? ' is-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {subs.length === 0 ? (
        <p className="fg-adm-muted">No {tab.toLowerCase()} submissions.</p>
      ) : (
        <table className="fg-adm-table">
          <thead>
            <tr>
              <th>Spot</th>
              <th>Category</th>
              <th>Submitted</th>
              <th>By</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id} onClick={() => setActive(s)} className="fg-adm-row">
                <td>{s.name}</td>
                <td>
                  <span className="fg-adm-cat">
                    <span className="fg-adm-cat-dot" style={{ background: catColor(s.categoryId) }}>
                      <CategoryGlyph cat={s.categoryId} size={12} />
                    </span>
                    {FG_CAT[s.categoryId]?.label ?? s.categoryId}
                  </span>
                </td>
                <td>{s.submittedAt}</td>
                <td>{s.submitterEmail ?? '—'}</td>
                <td className="fg-adm-row-go">View →</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="fg-adm-h2">Open reports</h2>
      {reports.length === 0 ? (
        <p className="fg-adm-muted">No open reports.</p>
      ) : (
        <table className="fg-adm-table">
          <thead>
            <tr>
              <th>Spot</th>
              <th>Reason</th>
              <th>Note</th>
              <th>When</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{r.placeName}</td>
                <td>{r.reason}</td>
                <td className="fg-adm-note">{r.note ?? '—'}</td>
                <td>{r.reportedAt}</td>
                <td className="fg-adm-actions">
                  <button className="fg-adm-btn" onClick={() => resolveReport(r, 'RESOLVED')}>
                    Resolve
                  </button>
                  <button className="fg-adm-btn fg-adm-btn-ghost" onClick={() => resolveReport(r, 'DISMISSED')}>
                    Dismiss
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {active && (
        <>
          <div className="fg-adm-scrim" onClick={() => setActive(null)} />
          <aside className="fg-adm-drawer">
            <button className="fg-adm-drawer-x" onClick={() => setActive(null)} aria-label="Close">
              ✕
            </button>
            <h3 className="fg-adm-drawer-h">{active.name}</h3>
            <p className="fg-adm-cat">
              <span className="fg-adm-cat-dot" style={{ background: catColor(active.categoryId) }}>
                <CategoryGlyph cat={active.categoryId} size={12} />
              </span>
              {FG_CAT[active.categoryId]?.label ?? active.categoryId}
            </p>
            <p className="fg-adm-drawer-note">{active.note}</p>
            <p className="fg-adm-muted">
              {active.lat.toFixed(4)}, {active.lng.toFixed(4)} · {active.submittedAt} ·{' '}
              {active.submitterEmail ?? 'anonymous'}
            </p>
            {active.photoUrls.length > 0 && (
              <div className="fg-adm-photos">
                {active.photoUrls.map((u) => (
                  <img key={u} src={u} alt="" className="fg-adm-photo" />
                ))}
              </div>
            )}
            {active.status === 'PENDING' && (
              <div className="fg-adm-drawer-actions">
                <button className="fg-adm-btn fg-adm-btn-primary" disabled={busy} onClick={() => approve(active)}>
                  Approve & publish
                </button>
                <button className="fg-adm-btn fg-adm-btn-ghost" disabled={busy} onClick={() => reject(active)}>
                  Reject
                </button>
              </div>
            )}
            {active.status !== 'PENDING' && (
              <p className="fg-adm-muted">Already {active.status.toLowerCase()}.</p>
            )}
          </aside>
        </>
      )}
    </section>
  )
}
