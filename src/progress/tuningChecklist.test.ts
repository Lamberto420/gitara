import { describe, expect, it } from 'vitest'
import { TUNED_HOLD_MS, createTuningChecklist } from './tuningChecklist'

/** Odczyty co 33 ms przez `ms` – ta sama struna i ten sam stan. */
function hold(c: ReturnType<typeof createTuningChecklist>, string: number | null, inTune: boolean, from: number, ms: number) {
  let at = from
  for (; at <= from + ms; at += 33) c.update(string, inTune, at)
  return at
}

describe('createTuningChecklist', () => {
  it('struna zalicza się po utrzymaniu czystego dźwięku', () => {
    const c = createTuningChecklist()
    hold(c, 6, true, 0, TUNED_HOLD_MS + 50)
    expect(c.update(null, false, 10_000)).toEqual(new Set([6]))
  })

  it('krótkie mignięcie „czysto” nie wystarcza', () => {
    const c = createTuningChecklist()
    let at = hold(c, 6, true, 0, 300)
    at = hold(c, 6, false, at, 100) // wskazówka uciekła
    hold(c, 6, true, at, 300)
    expect(c.update(null, false, 10_000).size).toBe(0)
  })

  it('zmiana struny zaczyna odliczanie od nowa', () => {
    const c = createTuningChecklist()
    const at = hold(c, 5, true, 0, 400)
    hold(c, 4, true, at, 400)
    expect(c.update(null, false, 10_000).size).toBe(0)
  })

  it('komplet po nastrojeniu wszystkich sześciu strun', () => {
    const c = createTuningChecklist()
    let at = 0
    for (const s of [6, 5, 4, 3, 2]) at = hold(c, s, true, at, TUNED_HOLD_MS + 50) + 1000
    expect(c.isComplete()).toBe(false)
    hold(c, 1, true, at, TUNED_HOLD_MS + 50)
    expect(c.isComplete()).toBe(true)
  })
})
