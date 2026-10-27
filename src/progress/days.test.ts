import { describe, expect, it } from 'vitest'
import { addDays, daysBetween } from './days'

describe('days', () => {
  it('przechodzi przez koniec miesiąca, roku i 29 lutego', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('zmiana czasu (ostatnia niedziela października / marca) nie gubi ani nie dubluje dni', () => {
    expect([...daysBetween('2026-10-24', '2026-10-27')]).toEqual(['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'])
    expect([...daysBetween('2027-03-27', '2027-03-29')]).toEqual(['2027-03-27', '2027-03-28', '2027-03-29'])
  })

  it('pusty zakres, gdy początek jest po końcu', () => {
    expect([...daysBetween('2026-10-28', '2026-10-27')]).toEqual([])
  })
})
