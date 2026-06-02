import { describe, it, expect } from 'vitest'
import { haversineKm, roundKm, TALLINN_CENTER } from './geo'

describe('haversineKm', () => {
  it('is zero for identical points', () => {
    expect(haversineKm(TALLINN_CENTER, TALLINN_CENTER)).toBe(0)
  })

  it('is symmetric', () => {
    const a = { lat: 59.437, lng: 24.745 }
    const b = { lat: 59.469, lng: 24.833 }
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9)
  })

  it('matches a known one-degree-latitude span (~111.19 km)', () => {
    const a = { lat: 0, lng: 0 }
    const b = { lat: 1, lng: 0 }
    expect(haversineKm(a, b)).toBeCloseTo(111.19, 1)
  })

  it('computes Tallinn center → Pirita (~7 km)', () => {
    const pirita = { lat: 59.469, lng: 24.833 }
    const d = haversineKm(TALLINN_CENTER, pirita)
    expect(d).toBeGreaterThan(5)
    expect(d).toBeLessThan(9)
  })
})

describe('roundKm', () => {
  it('rounds to one decimal', () => {
    expect(roundKm(0.456)).toBe(0.5)
    expect(roundKm(2.31)).toBe(2.3)
  })
})
