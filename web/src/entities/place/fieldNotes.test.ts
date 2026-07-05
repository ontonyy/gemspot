import { describe, expect, it } from 'vitest'
import { fieldNoteKeyLabel, fieldNoteValueLabel } from './fieldNotes'

describe('fieldNoteKeyLabel', () => {
  it('maps known keys to human labels', () => {
    expect(fieldNoteKeyLabel('access')).toBe('Access')
    expect(fieldNoteKeyLabel('lit')).toBe('Lighting')
    expect(fieldNoteKeyLabel('best')).toBe('Best time')
  })

  it('passes unknown keys through unchanged', () => {
    expect(fieldNoteKeyLabel('surface')).toBe('surface')
  })
})

describe('fieldNoteValueLabel', () => {
  it('maps access values', () => {
    expect(fieldNoteValueLabel('access', 'Free')).toBe('Free entry')
    expect(fieldNoteValueLabel('access', 'Paid')).toBe('Paid')
    expect(fieldNoteValueLabel('access', 'Booking')).toBe('Booking needed')
  })

  it('maps lit values', () => {
    expect(fieldNoteValueLabel('lit', 'Yes')).toBe('Lit at night')
    expect(fieldNoteValueLabel('lit', 'No')).toBe('Not lit')
  })

  it('maps best values', () => {
    expect(fieldNoteValueLabel('best', 'Eve')).toBe('Evenings')
    expect(fieldNoteValueLabel('best', 'Day')).toBe('Daytime')
    expect(fieldNoteValueLabel('best', 'Dusk')).toBe('Around dusk')
    expect(fieldNoteValueLabel('best', 'Apr')).toBe('April (season)')
  })

  it('passes unknown values through unchanged', () => {
    expect(fieldNoteValueLabel('best', 'Winter')).toBe('Winter')
    expect(fieldNoteValueLabel('access', 'Members')).toBe('Members')
    expect(fieldNoteValueLabel('unknownKey', 'X')).toBe('X')
  })
})
