import { describe, expect, it } from 'vitest'
import { createMedianFilter } from './median'

describe('createMedianFilter', () => {
  it('odrzuca pojedynczy skok', () => {
    const filter = createMedianFilter(5)
    ;[110, 110.2, 109.9, 110.1].forEach((v) => filter.push(v))
    expect(filter.push(220)).toBeCloseTo(110.1)
  })

  it('pamięta tylko ostatnie odczyty i da się wyczyścić', () => {
    const filter = createMedianFilter(3)
    ;[1, 2, 3, 10, 11].forEach((v) => filter.push(v))
    expect(filter.push(12)).toBe(11)
    filter.reset()
    expect(filter.push(5)).toBe(5)
  })
})
