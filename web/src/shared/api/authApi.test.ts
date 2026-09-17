/* Characterisation cover for the httpAuthApi error/204 semantics (authApi.ts
   `call` -> `throwHttp`). Written against the pre-refactor code so plan 030 can
   move the unwrap into authedFetch.ts and prove nothing changed. The http
   implementation is reached via `httpAuthApi`; `authApi` itself resolves to the
   in-memory mock when VITE_API_URL is unset. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { httpAuthApi } from './authApi'
import { useAuthStore } from '../store/authStore'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('authApi error unwrapping', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    useAuthStore.setState({ user: null, accessToken: null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws the server message string and carries the status', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'email already in use' }, 409))

    await expect(httpAuthApi.login({ email: 'a@b.c', password: 'x' })).rejects.toMatchObject({
      message: 'email already in use',
      status: 409,
    })
  })

  it('joins an array message', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: ['email must be an email', 'password too short'] }, 400))

    await expect(httpAuthApi.login({ email: 'a', password: 'x' })).rejects.toThrow(
      'email must be an email, password too short',
    )
  })

  it('falls back to status + statusText on a non-JSON error body', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>nope</html>', { status: 502, statusText: 'Bad Gateway' }))

    await expect(httpAuthApi.login({ email: 'a@b.c', password: 'x' })).rejects.toMatchObject({
      message: '502 Bad Gateway',
      status: 502,
    })
  })

  it('resolves undefined on 204 rather than parsing an empty body', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(httpAuthApi.logout()).resolves.toBeUndefined()
  })
})
