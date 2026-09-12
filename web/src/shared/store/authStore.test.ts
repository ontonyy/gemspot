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
  refreshToken: `refresh-${n}`,
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
    useAuthStore.setState({ user: null, accessToken: 'stale', refreshToken: 'refresh-0' })
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

  it('clears the session when the refresh token is dead', async () => {
    refreshMock.mockRejectedValueOnce(new Error('401 Unauthorized'))

    await expect(useAuthStore.getState().refreshSession()).resolves.toBe(false)

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
  })

  it('recovers after a failed refresh rather than wedging the guard', async () => {
    refreshMock.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(session(3))

    await expect(useAuthStore.getState().refreshSession()).resolves.toBe(false)
    useAuthStore.setState({ refreshToken: 'refresh-reissued' })
    await expect(useAuthStore.getState().refreshSession()).resolves.toBe(true)

    expect(refreshMock).toHaveBeenCalledTimes(2)
  })

  it('reports failure without calling the API when no refresh token is stored', async () => {
    useAuthStore.setState({ refreshToken: null })

    await expect(useAuthStore.getState().refreshSession()).resolves.toBe(false)

    expect(refreshMock).not.toHaveBeenCalled()
  })
})
