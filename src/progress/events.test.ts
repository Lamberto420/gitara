import { describe, expect, it } from 'vitest'
import { XP_TUNED, practiceEvent, tunedEvent } from './events'

const NOW = new Date(2026, 9, 27, 18, 0)

describe('practiceEvent', () => {
  it('2 nutki za pełną minutę, niepełna minuta bez nutek', () => {
    expect(practiceEvent('k', 150, NOW).xp).toBe(4)
    expect(practiceEvent('k', 59, NOW).xp).toBe(0)
  })

  it('z metronomem 3 nutki za minutę i znacznik w zdarzeniu', () => {
    const e = practiceEvent('k', 120, NOW, true)
    expect(e.xp).toBe(6)
    expect(e.metronome).toBe(true)
    expect(practiceEvent('k', 60, NOW)).not.toHaveProperty('metronome')
  })
})

describe('tunedEvent', () => {
  it('raz dziennie: id z osoby i dnia', () => {
    const e = tunedEvent('k', NOW)
    expect(e).toMatchObject({ id: 'tuned:k:2026-10-27', day: '2026-10-27', type: 'tuned', xp: XP_TUNED })
    expect(tunedEvent('k', new Date(2026, 9, 27, 9, 0)).id).toBe(e.id)
  })
})
