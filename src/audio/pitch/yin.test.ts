import { describe, expect, it } from 'vitest'
import { detectPitch, rms } from './yin'
import { STANDARD_TUNING, cents } from './notes'

const SIZE = 4096

/** Sygnał testowy: suma harmonicznych [amplituda kolejnych alikwotów 1f, 2f, 3f…]. */
function tone(freq: number, sampleRate: number, harmonics = [1]): Float32Array {
  const out = new Float32Array(SIZE)
  for (let i = 0; i < SIZE; i++) {
    let v = 0
    harmonics.forEach((amp, h) => {
      v += amp * Math.sin((2 * Math.PI * freq * (h + 1) * i) / sampleRate)
    })
    out[i] = v * 0.3
  }
  return out
}

/** Deterministyczny „szum” (generator LCG), żeby testy zawsze dawały ten sam wynik. */
function addNoise(signal: Float32Array, level: number): Float32Array {
  let seed = 12345
  return signal.map((v) => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31
    return v + (seed / 2 ** 31 - 0.5) * 2 * level
  })
}

describe.each([44100, 48000])('detectPitch przy %i Hz', (sampleRate) => {
  it.each(STANDARD_TUNING.map((s) => [`${s.name}${s.octave}`, s.freq]))(
    'czysty sinus %s',
    (_, freq) => {
      const detected = detectPitch(tone(freq, sampleRate), sampleRate)
      expect(detected).not.toBeNull()
      expect(Math.abs(cents(detected!, freq))).toBeLessThan(1)
    },
  )

  it.each(STANDARD_TUNING.map((s) => [`${s.name}${s.octave}`, s.freq]))(
    'dźwięk „gitarowy” %s z mocnymi alikwotami (bez błędu oktawy)',
    (_, freq) => {
      // Na grubych strunach 2. harmoniczna bywa głośniejsza niż podstawowa.
      const detected = detectPitch(tone(freq, sampleRate, [0.6, 1, 0.5, 0.3]), sampleRate)
      expect(Math.abs(cents(detected!, freq))).toBeLessThan(1)
    },
  )
})

describe('detectPitch – przypadki brzegowe', () => {
  const sr = 48000

  it('rozpoznaje strunę rozstrojoną o 10 centów', () => {
    const freq = 110 * 2 ** (10 / 1200)
    const detected = detectPitch(tone(freq, sr, [1, 0.5]), sr)
    expect(cents(detected!, 110)).toBeCloseTo(10, 0)
  })

  it('działa z szumem tła', () => {
    const detected = detectPitch(addNoise(tone(196, sr, [1, 0.5, 0.3]), 0.05), sr)
    expect(Math.abs(cents(detected!, 196))).toBeLessThan(2)
  })

  it('cisza i czysty szum dają null', () => {
    expect(detectPitch(new Float32Array(SIZE), sr)).toBeNull()
    expect(detectPitch(addNoise(new Float32Array(SIZE), 0.3), sr)).toBeNull()
  })

  it('rms mierzy głośność', () => {
    expect(rms(new Float32Array(SIZE))).toBe(0)
    // RMS sinusa o amplitudzie A to A/√2
    expect(rms(tone(440, sr))).toBeCloseTo(0.3 / Math.SQRT2, 2)
  })
})
