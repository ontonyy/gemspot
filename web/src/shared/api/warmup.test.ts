/* Characterisation cover for warmupBackend. Both this module and track.ts read
   VITE_API_URL at module load, so each case stubs the env and re-imports.
   Pins the no-op-on-mock behaviour before plan 030 moves BASE into authedFetch. */

import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadWarmup(apiUrl: string | undefined) {
  vi.resetModules()
  vi.stubEnv('VITE_API_URL', apiUrl as string)
  return (await import('./warmup')).warmupBackend
}

describe('warmupBackend', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('does not call the network when VITE_API_URL is unset', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const warmupBackend = await loadWarmup('')

    warmupBackend()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('GETs /health against the trimmed base URL', async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const warmupBackend = await loadWarmup('https://api.example.test/')

    warmupBackend()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.test/health')
  })

  it('swallows a rejected request rather than throwing at the call site', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const warmupBackend = await loadWarmup('https://api.example.test')

    expect(() => warmupBackend()).not.toThrow()
    await Promise.resolve()
  })
})
