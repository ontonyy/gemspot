import { useCallback, useEffect, useState } from 'react'
import {
  adminApi,
  type AdminPlace,
  type AdminPlaceStatus,
} from '../../shared/api/adminApi'
import { useAuthStore } from '../../shared/store/authStore'
import { CategoryGlyph, FG_CAT, catColor, type CategoryId } from '../../entities/place/categories'

const STATUSES: AdminPlaceStatus[] = ['ACTIVE', 'INACTIVE', 'DRAFT']

/* Places management — list every place (any status) + flip PlaceStatus. Setting
   a place INACTIVE/DRAFT removes it from the public map (public list = ACTIVE). */
export default function AdminPlaces() {
  const token = useAuthStore((s) => s.accessToken)!
  const [places, setPlaces] = useState<AdminPlace[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(() => {
    adminApi.listPlaces(token).then(setPlaces).catch(() => undefined)
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const setStatus = async (p: AdminPlace, status: AdminPlaceStatus) => {
    if (status === p.status) return
    try {
      const updated = await adminApi.setPlaceStatus(token, p.id, status)
      setPlaces((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      setMsg(`${updated.name} → ${status}`)
      setTimeout(() => setMsg(null), 2200)
    } catch {
      /* ignore */
    }
  }

  return (
    <section>
      <h1 className="fg-adm-h1">Places</h1>
      {msg && <div className="fg-adm-flash">{msg}</div>}
      <table className="fg-adm-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Name</th>
            <th>Category</th>
            <th>Area</th>
            <th>Saves</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {places.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>
                <span className="fg-adm-cat">
                  <span className="fg-adm-cat-dot" style={{ background: catColor(p.categoryId as CategoryId) }}>
                    <CategoryGlyph cat={p.categoryId as CategoryId} size={12} />
                  </span>
                  {FG_CAT[p.categoryId as CategoryId]?.label ?? p.categoryId}
                </span>
              </td>
              <td>{p.neighborhood}</td>
              <td>{p.savesCount}</td>
              <td>
                <select
                  className="fg-adm-select"
                  value={p.status}
                  onChange={(e) => setStatus(p, e.target.value as AdminPlaceStatus)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
