import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildStyle } from './buildStyle'
import { PROVIDERS } from './provider'

describe('buildStyle', () => {
  it('templates the OpenFreeMap provider into glyphs + openmaptiles source', () => {
    const s = buildStyle(PROVIDERS.openfreemap)
    expect(s.glyphs).toBe(PROVIDERS.openfreemap.glyphs)
    expect(s.glyphs).toContain('tiles.openfreemap.org')
    const src = s.sources.openmaptiles as { type: string; url: string; attribution: string }
    expect(src.type).toBe('vector')
    expect(src.url).toBe(PROVIDERS.openfreemap.tiles)
    expect(src.url).toBe('https://tiles.openfreemap.org/planet')
    expect(src.attribution).toContain('OpenFreeMap')
  })

  it('templates the MapTiler provider into glyphs + openmaptiles source', () => {
    const s = buildStyle(PROVIDERS.maptiler)
    expect(s.glyphs).toBe(PROVIDERS.maptiler.glyphs)
    expect(s.glyphs).toContain('api.maptiler.com/fonts/{fontstack}/{range}.pbf')
    const src = s.sources.openmaptiles as { type: string; url: string; attribution: string }
    expect(src.type).toBe('vector')
    expect(src.url).toBe(PROVIDERS.maptiler.tiles)
    expect(src.url).toContain('api.maptiler.com/tiles/v3/tiles.json')
    expect(src.attribution).toContain('MapTiler')
  })

  it('does not mutate the shared base across calls (structuredClone)', () => {
    const a = buildStyle(PROVIDERS.openfreemap)
    const b = buildStyle(PROVIDERS.maptiler)
    expect(a.glyphs).not.toBe(b.glyphs)
    expect((a.sources.openmaptiles as { url: string }).url).not.toBe(
      (b.sources.openmaptiles as { url: string }).url,
    )
  })
})

describe('provider ACTIVE/FALLBACK resolution', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('defaults ACTIVE to openfreemap when VITE_MAP_PROVIDER is unset', async () => {
    vi.stubEnv('VITE_MAP_PROVIDER', undefined as unknown as string)
    vi.resetModules()
    const mod = await import('./provider')
    expect(mod.ACTIVE).toBe('openfreemap')
    expect(mod.provider).toBe(mod.PROVIDERS.openfreemap)
  })

  it('resolves ACTIVE from VITE_MAP_PROVIDER=maptiler', async () => {
    vi.stubEnv('VITE_MAP_PROVIDER', 'maptiler')
    vi.resetModules()
    const mod = await import('./provider')
    expect(mod.ACTIVE).toBe('maptiler')
    expect(mod.provider).toBe(mod.PROVIDERS.maptiler)
  })

  it('always pins FALLBACK to OpenFreeMap regardless of ACTIVE', async () => {
    vi.stubEnv('VITE_MAP_PROVIDER', 'maptiler')
    vi.resetModules()
    const mod = await import('./provider')
    expect(mod.FALLBACK).toBe(mod.PROVIDERS.openfreemap)
    expect(mod.FALLBACK.tiles).toBe('https://tiles.openfreemap.org/planet')
  })
})
