/* Covers the 401 -> refresh -> retry-once seam in authedFetch (httpPlacesApi.ts).
   Driven through the public surface (getMySubmissions -> getJson(path, true)) so
   the test doesn't depend on authedFetch staying private.

   refreshSession is injected via useAuthStore.setState rather than mocked at the
   module level: authedFetch reads it off the store on every call, so a stub there
   is the real seam, and it lets each case assert how many times refresh was
   attempted. The store's own refreshSession is covered in authStore.test.ts. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { httpPlacesApi } from './httpPlacesApi'
import { useAuthStore } from '../store/authStore'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const unauthorized = () => new Response(null, { status: 401 })

const ROWS = [{ id: 's1', name: 'Spot' }]

/** Authorization header of the nth fetch call (1-indexed), or undefined. */
function bearerOf(fetchMock: ReturnType<typeof vi.fn>, call: number): string | undefined {
  const init = fetchMock.mock.calls[call - 1]?.[1] as RequestInit | undefined
  return (init?.headers as Record<string, string> | undefined)?.Authorization
}

describe('authedFetch 401 -> refresh -> retry', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    useAuthStore.setState({ user: null, accessToken: 'stale-token', refreshToken: 'refresh-token' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not refresh when the first attempt succeeds', async () => {
    const refreshSession = vi.fn(async () => true)
    useAuthStore.setState({ refreshSession })
    fetchMock.mockResolvedValueOnce(json(ROWS))

    await expect(httpPlacesApi.getMySubmissions()).resolves.toEqual(ROWS)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(refreshSession).not.toHaveBeenCalled()
    expect(bearerOf(fetchMock, 1)).toBe('Bearer stale-token')
  })

  it('refreshes once on 401 and returns the retried response', async () => {
    const refreshSession = vi.fn(async () => {
      useAuthStore.setState({ accessToken: 'fresh-token' })
      return true
    })
    useAuthStore.setState({ refreshSession })
    fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(json(ROWS))

    await expect(httpPlacesApi.getMySubmissions()).resolves.toEqual(ROWS)

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(bearerOf(fetchMock, 1)).toBe('Bearer stale-token')
    expect(bearerOf(fetchMock, 2)).toBe('Bearer fresh-token')
  })

  it('gives up after one failed refresh instead of looping', async () => {
    const refreshSession = vi.fn(async () => false)
    useAuthStore.setState({ refreshSession })
    fetchMock.mockResolvedValue(unauthorized())

    await expect(httpPlacesApi.getMySubmissions()).rejects.toMatchObject({ status: 401 })

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries at most once even when the retry also 401s', async () => {
    const refreshSession = vi.fn(async () => {
      useAuthStore.setState({ accessToken: 'fresh-token' })
      return true
    })
    useAuthStore.setState({ refreshSession })
    fetchMock.mockResolvedValue(unauthorized())

    await expect(httpPlacesApi.getMySubmissions()).rejects.toMatchObject({ status: 401 })

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not attempt a refresh without a refresh token', async () => {
    const refreshSession = vi.fn(async () => true)
    useAuthStore.setState({ refreshSession, refreshToken: null })
    fetchMock.mockResolvedValue(unauthorized())

    await expect(httpPlacesApi.getMySubmissions()).rejects.toMatchObject({ status: 401 })

    expect(refreshSession).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
