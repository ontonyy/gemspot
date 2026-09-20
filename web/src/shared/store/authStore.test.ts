/* Covers refreshSession: the module-level refreshInFlight dedupe, the guard
   resetting after settle, and the session clear on a dead refresh token.

   authApi is mocked at the module level because refreshInFlight is module state
   with no test hook — the only way to observe dedupe is to count calls to the
   one thing it guards. A deferred promise keeps the refresh in flight so two
   callers overlap deterministically, with no timing assumptions. */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthResponse } from '../api/authApi'
import { authApi } from '../api/authApi'
import { useAuthStore } from './authStore'

vi.mock('../api/authApi', () => ({
  authApi: {
    refresh: vi.fn(),
    logout: vi.fn(async () => undefined),
  },
}))

const refreshMock = vi.mocked(authApi.refresh)

const session = (n: number): AuthResponse => ({
  user: { id: 'u1', email: 'a@b.ee', name: 'A', role: 'CLIENT' },
  accessToken: `access-${n}`,
})

/** A refresh that stays pending until the returned resolve/reject is called. */
function deferredRefresh() {
  let settle: (r: AuthResponse) => void = () => {}
  let fail: (e: Error) => void = () => {}
  const pending = new Promise<AuthResponse>((res, rej) => {
    settle = res
    fail = rej
  })
  refreshMock.mockReturnValueOnce(pending)
  return { settle, fail }
}

describe('refreshSession', () => {
  beforeEach(() => {
    refreshMock.mockReset()
    useAuthStore.setState({ user: null, accessToken: 'stale' })
  })

  it('dedupes concurrent callers into a single refresh request', async () => {
    const { settle } = deferredRefresh()

    const first = useAuthStore.getState().refreshSession()
    const second = useAuthStore.getState().refreshSession()
    settle(session(1))

    // Asserted first: on a dedupe regression this is the failure the reader sees.
    expect(refreshMock).toHaveBeenCalledTimes(1)
    expect(await first).toBe(true)
    expect(await second).toBe(true)
    expect(useAuthStore.getState().accessToken).toBe('access-1')
  })

  it('releases the in-flight guard so a later call refreshes again', async () => {
    refreshMock.mockResolvedValueOnce(session(1)).mockResolvedValueOnce(session(2))

    await expect(useAuthStore.getState().refreshSession()).resolves.toBe(true)
    await expect(useAuthStore.getState().refreshSession()).resolves.toBe(true)

    expect(refreshMock).toHaveBeenCalledTimes(2)
    expect(useAuthStore.getState().accessToken).toBe('access-2')
  })

  it('clears the session when the refresh cookie is dead', async () => {
    refreshMock.mockRejectedValueOnce(new Error('401 Unauthorized'))

    await expect(useAuthStore.getState().refreshSession()).resolves.toBe(false)

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
  })

  it('recovers after a failed refresh rather than wedging the guard', async () => {
    refreshMock.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(session(3))

    await expect(useAuthStore.getState().refreshSession()).resolves.toBe(false)
    await expect(useAuthStore.getState().refreshSession()).resolves.toBe(true)

    expect(refreshMock).toHaveBeenCalledTimes(2)
  })

})

/* The point of plan 032 / ADR 0006. If this ever fails, a 30-day credential is
   back in reach of any script on the origin and the change has been undone. */
describe('persisted state', () => {
  it('never writes a refresh token to localStorage after a session is applied', async () => {
    refreshMock.mockResolvedValueOnce(session(1))
    await useAuthStore.getState().refreshSession()

    const raw = localStorage.getItem('gemspot.auth') ?? ''

    expect(raw).not.toContain('refreshToken')
    expect(raw).toContain('accessToken')
    expect(JSON.parse(raw).state).not.toHaveProperty('refreshToken')
  })

  it('drops a v1 refresh token rather than carrying it forward', () => {
    const migrate = (useAuthStore.persist.getOptions().migrate ?? ((s: unknown) => s)) as (
      s: unknown,
      v: number,
    ) => Record<string, unknown>

    const migrated = migrate({ user: null, accessToken: 'a', refreshToken: 'leaked-30d-credential' }, 1)

    expect(migrated).not.toHaveProperty('refreshToken')
    expect(migrated).toHaveProperty('accessToken', 'a')
  })
})
