import { useEffect, useState } from 'react'
import { adminApi, type AdminUser } from '../../shared/api/adminApi'
import { useAuthStore } from '../../shared/store/authStore'

/* Read-only user roster — id, email, role, join time. */
export default function AdminUsers() {
  const token = useAuthStore((s) => s.accessToken)!
  const [users, setUsers] = useState<AdminUser[]>([])

  useEffect(() => {
    adminApi.listUsers(token).then(setUsers).catch(() => undefined)
  }, [token])

  return (
    <section>
      <h1 className="fg-adm-h1">Users</h1>
      <table className="fg-adm-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.name ?? '—'}</td>
              <td>
                <span className={`fg-adm-role${u.role === 'ADMIN' ? ' is-admin' : ''}`}>{u.role}</span>
              </td>
              <td>{u.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
