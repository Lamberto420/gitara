import { describe, expect, it } from 'vitest'
import { melodySchedule } from './melody'
import { parseSong } from './song'

const song = parseSong({
  id: 't',
  title: 'T',
  origin: 'test',
  meter: [4, 4],
  bpm: 120,
  phrases: [{ notes: 'C5 D5/8 D5/8 R/2 | E5/1' }],
})

describe('melodySchedule', () => {
  it('ćwierćnuta przy 120 bpm = pół sekundy; pauza przesuwa czas; brzmienie oktawę niżej', () => {
    const s = melodySchedule(song.phrases[0].items, 120)
    expect(s.map((n) => n.start)).toEqual([0, 0.5, 0.75, 2])
    expect(s.map((n) => n.index)).toEqual([0, 1, 2, 3])
    expect(s[0].midi).toBe(72 - 12) // zapis C5 = MIDI 72
    // Krótka przerwa przed następną nutą – powtórzone D słychać osobno.
    expect(s[1].duration).toBeCloseTo(0.225)
    expect(s[3].duration).toBeCloseTo(1.8)
  })
})
