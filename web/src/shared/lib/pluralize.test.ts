import { describe, expect, it } from 'vitest'
import { pluralNoun, pluralize } from './pluralize'

describe('pluralize', () => {
  it('singular at 1', () => {
    expect(pluralize(1, 'spot')).toBe('1 spot')
    expect(pluralNoun(1, 'spot')).toBe('spot')
  })
  it('plural otherwise', () => {
    expect(pluralize(0, 'spot')).toBe('0 spots')
    expect(pluralize(2, 'guide')).toBe('2 guides')
    expect(pluralNoun(3, 'spot')).toBe('spots')
  })
  it('irregular plural override', () => {
    expect(pluralize(2, 'match', 'matches')).toBe('2 matches')
  })
})
