/* Characterisation cover for track(). Fire-and-forget: no throw at the call
   site, no network on the mock. track.ts reads VITE_API_URL at module load, so
   each case stubs the env and re-imports. */

import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadTrack(apiUrl: string) {
  vi.resetModules()
  vi.stubEnv('VITE_API_URL', apiUrl)
  return (await import('./track')).track
}

describe('track', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('does not call the network when VITE_API_URL is unset', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    const track = await loadTrack('')

    track('save', { a: 1 }, 'place-1')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('POSTs the event to /events with keepalive', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const track = await loadTrack('https://api.example.test/')

    track('share', { from: 'detail' }, 'place-1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.example.test/events')
    expect(init?.method).toBe('POST')
    expect(init?.keepalive).toBe(true)
    expect(JSON.parse(init?.body as string)).toEqual({
      name: 'share', props: { from: 'detail' }, placeId: 'place-1',
    })
  })

  it('swallows a rejected request rather than throwing at the call site', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const track = await loadTrack('https://api.example.test')

    expect(() => track('pin')).not.toThrow()
    await Promise.resolve()
  })
})
