import { describe, expect, it } from 'vitest'
import { STANDARD_TUNING, cents, midiToFreq, nearestString, tuneStatus } from './notes'

describe('notes', () => {
  it('A4 to 440 Hz, a struny mają znane częstotliwości', () => {
    expect(midiToFreq(69)).toBe(440)
    const freqs = STANDARD_TUNING.map((s) => Number(s.freq.toFixed(2)))
    expect(freqs).toEqual([82.41, 110, 146.83, 196, 246.94, 329.63])
  })

  it('liczy centy: oktawa = 1200, półton = 100', () => {
    expect(cents(880, 440)).toBeCloseTo(1200)
    expect(cents(midiToFreq(70), 440)).toBeCloseTo(100)
    expect(cents(430, 440)).toBeLessThan(0)
  })

  it('znajduje najbliższą strunę', () => {
    expect(nearestString(84).number).toBe(6)
    expect(nearestString(108).name).toBe('A')
    expect(nearestString(240).number).toBe(2)
    expect(nearestString(1000).number).toBe(1)
  })

  it('ocenia nastrojenie', () => {
    expect(tuneStatus(3)).toBe('in-tune')
    expect(tuneStatus(-5)).toBe('in-tune')
    expect(tuneStatus(-12)).toBe('close')
    expect(tuneStatus(40)).toBe('far')
  })
})
