import { relativeTime } from '../src/application/common/relative-time'

describe('relativeTime', () => {
  const now = new Date('2026-06-04T12:00:00Z')
  const ago = (ms: number) => new Date(now.getTime() - ms)
  const SEC = 1000
  const MIN = 60 * SEC
  const HR = 60 * MIN
  const DAY = 24 * HR

  it('reads "just now" under 45s', () => {
    expect(relativeTime(ago(10 * SEC), now)).toBe('just now')
  })

  it('clamps future dates to "just now"', () => {
    expect(relativeTime(new Date(now.getTime() + 5 * SEC), now)).toBe('just now')
  })

  it('singular vs plural minutes', () => {
    expect(relativeTime(ago(1 * MIN), now)).toBe('1 minute ago')
    expect(relativeTime(ago(5 * MIN), now)).toBe('5 minutes ago')
  })

  it('hours and days', () => {
    expect(relativeTime(ago(1 * HR), now)).toBe('1 hour ago')
    expect(relativeTime(ago(3 * HR), now)).toBe('3 hours ago')
    expect(relativeTime(ago(1 * DAY), now)).toBe('1 day ago')
    expect(relativeTime(ago(12 * DAY), now)).toBe('12 days ago')
  })
})
