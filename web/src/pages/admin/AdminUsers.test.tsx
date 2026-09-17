/* Proof that the jsdom + Testing Library harness works, driven through the
   smallest component with a real async data path.

   The seam under test is AdminUsers' effect: read the access token off the auth
   store, call adminApi.listUsers, render whatever comes back. The token is
   injected via useAuthStore.setState (the house pattern from
   httpPlacesApi.test.ts) and listUsers is stubbed with vi.spyOn so the component
   itself stays untouched.

   Case 3 covers the failure path: since plan 022 a rejected listUsers surfaces
   in the page's flash slot instead of being swallowed into an empty table. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import AdminUsers from './AdminUsers'
import { adminApi, type AdminUser } from '../../shared/api/adminApi'
import { useAuthStore } from '../../shared/store/authStore'

const USERS: AdminUser[] = [
  { id: 'u-admin', email: 'admin@gemspot.ee', name: 'GemSpot Admin', role: 'ADMIN', createdAt: 'just now' },
  { id: 'u-1', email: 'local@gemspot.ee', name: null, role: 'CLIENT', createdAt: '2 days ago' },
]

/** Data rows currently rendered in the roster table body. */
const rows = () => screen.getByRole('table').querySelectorAll('tbody tr')

describe('<AdminUsers />', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    useAuthStore.setState({ accessToken: null })
  })

  it('renders a row per user returned by the API', async () => {
    const listUsers = vi.spyOn(adminApi, 'listUsers').mockResolvedValue(USERS)

    render(<AdminUsers />)

    expect(await screen.findByText('admin@gemspot.ee')).toBeInTheDocument()
    expect(screen.getByText('local@gemspot.ee')).toBeInTheDocument()
    expect(listUsers).toHaveBeenCalledWith('test-token')
  })

  it('renders an empty table when there are no users', async () => {
    const listUsers = vi.spyOn(adminApi, 'listUsers').mockResolvedValue([])

    render(<AdminUsers />)

    await waitFor(() => expect(listUsers).toHaveBeenCalled())
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(rows()).toHaveLength(0)
  })

  it('surfaces a rejected request instead of showing an empty roster', async () => {
    vi.spyOn(adminApi, 'listUsers').mockRejectedValue(new Error('boom'))

    render(<AdminUsers />)

    expect(await screen.findByText("Couldn't load users.")).toBeInTheDocument()
    expect(rows()).toHaveLength(0)
  })
})
