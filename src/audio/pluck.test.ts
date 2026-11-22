import { describe, expect, it } from 'vitest'
import { FIRST_POSITION } from '../music/firstPosition'
import { cents, midiToFreq } from './pitch/notes'
import { detectPitch, rms } from './pitch/yin'
import { pluckSamples } from './pluck'

const SR = 48000
const WINDOW = 4096 // jak analizator mikrofonu w aplikacji

describe('pluckSamples', () => {
  it('każda nuta I pozycji ma dokładną wysokość (±3 centy) – przy 44,1 i 48 kHz', () => {
    for (const sr of [44100, SR]) {
      for (const n of FIRST_POSITION) {
        const freq = midiToFreq(n.midi)
        const s = pluckSamples(freq, sr, 0.6)
        // Po ataku, gdy dźwięk się ustali.
        const detected = detectPitch(s.subarray(Math.round(0.2 * sr), Math.round(0.2 * sr) + WINDOW), sr)
        expect(detected, `${n.name} ${n.midi} @${sr}`).not.toBeNull()
        expect(Math.abs(cents(detected!, freq)), `${n.name} ${n.midi} @${sr}`).toBeLessThan(3)
      }
    }
  })

  it('wybrzmiewa: później ciszej, ale po sekundzie wciąż słychać', () => {
    const s = pluckSamples(midiToFreq(57), SR, 2)
    const at = (t: number) => rms(s.subarray(Math.round(t * SR), Math.round(t * SR) + WINDOW))
    expect(at(0.5)).toBeLessThan(at(0.02))
    expect(at(1.5)).toBeLessThan(at(0.5))
    expect(at(1)).toBeGreaterThan(at(0.02) / 30)
    // Gaśnie też sama podstawa (po ataku zostaje głównie ona) – nie dzwoni w nieskończoność jak organy.
    expect(at(1.9)).toBeLessThan(at(0.4) * 0.5)
  })

  it('wysokie składowe gasną szybciej niż podstawa (różnica między próbkami maleje względem głośności)', () => {
    const s = pluckSamples(midiToFreq(52), SR, 2)
    const brightness = (t: number) => {
      const a = s.subarray(Math.round(t * SR), Math.round(t * SR) + WINDOW)
      const diff = a.slice(1).map((v, i) => v - a[i])
      return rms(diff) / rms(a)
    }
    expect(brightness(1)).toBeLessThan(brightness(0.01))
  })

  it('szczyt = 1, bez NaN, ten sam dźwięk przy tym samym ziarnie', () => {
    const a = pluckSamples(196, SR, 1)
    expect(Math.max(...a.map(Math.abs))).toBeCloseTo(1)
    expect(a.every(Number.isFinite)).toBe(true)
    expect(pluckSamples(196, SR, 1)).toEqual(a)
    expect(pluckSamples(196, SR, 1, { seed: 2 })).not.toEqual(a)
  })
})
