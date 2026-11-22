import { describe, expect, it } from 'vitest'
import { RING_S, melodySchedule } from './melody'
import { parseSong } from './song'

const song = (notes: string) =>
  parseSong({ id: 't', title: 'T', origin: 'test', meter: [4, 4], bpm: 120, phrases: [{ notes }] }).phrases[0].items

describe('melodySchedule', () => {
  it('ćwierćnuta przy 120 bpm = pół sekundy; pauza przesuwa czas; brzmienie oktawę niżej', () => {
    const s = melodySchedule(song('C5 D5/8 D5/8 R/2 | E5/1'), 120)
    expect(s.map((n) => n.start)).toEqual([0, 0.5, 0.75, 2])
    expect(s.map((n) => n.index)).toEqual([0, 1, 2, 3])
    expect(s[0].midi).toBe(72 - 12) // zapis C5 = MIDI 72
  })

  it('ta sama struna: nuta milknie tuż przed następną (powtórzone D słychać osobno)', () => {
    // D5 i C5 – struna 2 (próg 3 i 1); E5 – struna 1.
    const s = melodySchedule(song('C5 D5/8 D5/8 R/2 | E5/1'), 120)
    expect(s.map((n) => n.string)).toEqual([2, 2, 2, 1])
    expect(s[0].duration).toBeCloseTo(0.47)
    expect(s[1].duration).toBeCloseTo(0.22)
  })

  it('inna struna nie przerywa – poprzednia nuta wybrzmiewa (aż do RING_S)', () => {
    const s = melodySchedule(song('C5 D5/8 D5/8 R/2 | E5/1'), 120)
    expect(s[2].duration).toBe(RING_S) // po D5 już tylko E5 na strunie 1
    expect(s[3].duration).toBe(RING_S)
    // G4 (struna 3) i H4 (struna 2) na przemian: każda brzmi do swojej następnej.
    const t = melodySchedule(song('G4 H4 G4 H4'), 120)
    expect(t[0].duration).toBeCloseTo(1 - 0.03)
  })
})
