import { describe, expect, it } from 'vitest'
import { STANDARD_TUNING, analyze, cents, freqToMidi, isGuitarPitch, midiToFreq, nearestString, tuneStatus } from './notes'

describe('isGuitarPitch', () => {
  it('wszystkie puste struny i wysokie progi to gitara', () => {
    for (const s of STANDARD_TUNING) expect(isGuitarPitch(s.freq)).toBe(true)
    expect(isGuitarPitch(midiToFreq(64 + 19))).toBe(true) // 19. próg struny E4
  })

  it('brak wysokości, buczenie sieci i pisk to nie gitara', () => {
    expect(isGuitarPitch(null)).toBe(false)
    expect(isGuitarPitch(50)).toBe(false)
    expect(isGuitarPitch(3000)).toBe(false)
  })
})

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

  describe('analyze', () => {
    const [lowE, a, d, g] = STANDARD_TUNING

    it('w trybie auto wybiera najbliższą strunę', () => {
      const reading = analyze(108)
      expect(reading.string).toBe(a)
      expect(reading.status).toBe('far')
      expect(reading.wrongString).toBe(false)
    })

    it('z blokadą porównuje z wybraną struną, nawet gdy bliżej jest inna', () => {
      // Struna G spuszczona o 280 centów jest bliżej D – tryb auto pomyliłby struny.
      const freq = g.freq * 2 ** (-280 / 1200)
      expect(analyze(freq).string).toBe(d)
      const reading = analyze(freq, g)
      expect(reading.string).toBe(g)
      expect(reading.cents).toBeCloseTo(-280)
      expect(reading.wrongString).toBe(false)
    })

    it('z blokadą wykrywa zagraną inną strunę', () => {
      expect(analyze(a.freq, lowE).wrongString).toBe(true)
    })
  })
})

describe('freqToMidi', () => {
  it('odwraca midiToFreq', () => {
    expect(freqToMidi(440)).toBe(69)
    expect(freqToMidi(midiToFreq(40))).toBeCloseTo(40, 10)
  })
})
