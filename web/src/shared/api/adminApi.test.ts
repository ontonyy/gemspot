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

/* Error unwrapping — characterised before plan 030 moved it into authedFetch.ts.
   Identical semantics to authApi's throwHttp; that is the duplication 030 removes. */
describe('adminApi error unwrapping', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    useAuthStore.setState({ user: null, accessToken: 'token', refreshToken: null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws the server message and carries the status', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'submission already approved' }, 409))

    await expect(httpAdminApi.approveSubmission('token', 'sub-1')).rejects.toMatchObject({
      message: 'submission already approved',
      status: 409,
    })
  })

  it('joins an array message and falls back on a non-JSON body', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: ['bad status', 'bad id'] }, 400))
    await expect(httpAdminApi.listPlaces('token')).rejects.toThrow('bad status, bad id')

    fetchMock.mockResolvedValueOnce(new Response('<html/>', { status: 500, statusText: 'Server Error' }))
    await expect(httpAdminApi.listPlaces('token')).rejects.toThrow('500 Server Error')
  })

  it('resolves undefined on 204', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(httpAdminApi.rejectSubmission('token', 'sub-1')).resolves.toBeUndefined()
  })
})
