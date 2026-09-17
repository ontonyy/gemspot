/* Covers the 401 -> refresh -> retry-once seam for the admin client, driven
   through the public surface (httpAdminApi.listPlaces -> call). The http
   implementation is imported by name because `adminApi` resolves to the
   in-memory mock when VITE_API_URL is unset. Mirrors httpPlacesApi.test.ts;
   refreshSession is injected via useAuthStore.setState, not module-mocked. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { httpAdminApi } from './adminApi'
import { useAuthStore } from '../store/authStore'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const unauthorized = () => new Response(null, { status: 401 })

const ROWS = [{ id: 'p1', slug: 'spot', name: 'Spot' }]

/** Authorization header of the nth fetch call (1-indexed), or undefined. */
function bearerOf(fetchMock: ReturnType<typeof vi.fn>, call: number): string | undefined {
  const init = fetchMock.mock.calls[call - 1]?.[1] as RequestInit | undefined
  return (init?.headers as Record<string, string> | undefined)?.Authorization
}

describe('adminApi 401 -> refresh -> retry', () => {
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

    await expect(httpAdminApi.listPlaces('stale-token')).resolves.toEqual(ROWS)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(refreshSession).not.toHaveBeenCalled()
    expect(bearerOf(fetchMock, 1)).toBe('Bearer stale-token')
  })

  it('refreshes once on 401 and retries with the new token', async () => {
    const refreshSession = vi.fn(async () => {
      useAuthStore.setState({ accessToken: 'fresh-token' })
      return true
    })
    useAuthStore.setState({ refreshSession })
    fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(json(ROWS))

    await expect(httpAdminApi.listPlaces('stale-token')).resolves.toEqual(ROWS)

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(bearerOf(fetchMock, 1)).toBe('Bearer stale-token')
    expect(bearerOf(fetchMock, 2)).toBe('Bearer fresh-token')
  })

  it('gives up after one failed refresh instead of looping', async () => {
    const refreshSession = vi.fn(async () => false)
    useAuthStore.setState({ refreshSession })
    fetchMock.mockResolvedValue(unauthorized())

    await expect(httpAdminApi.listPlaces('stale-token')).rejects.toMatchObject({ status: 401 })

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
