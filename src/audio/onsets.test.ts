import { describe, expect, it } from 'vitest'
import { createOnsetDetector, type Onset } from './onsets'

const SR = 48000

interface Pluck {
  t: number
  f: number
  a?: number
}

/** Sygnał: szarpnięcia (sinus z wykładniczym opadaniem) i tyki (1000 Hz, 50 ms) w podanych chwilach. */
function signal(seconds: number, plucks: Pluck[], clicks: { t: number; a?: number }[] = []) {
  const s = new Float32Array(Math.round(seconds * SR))
  for (const { t, f, a = 0.5 } of plucks) {
    const start = Math.round(t * SR)
    // Poprzednia nuta brzmi dalej (dodajemy) – trudniejszy przypadek niż prawdziwa struna, którą nowe szarpnięcie wycisza.
    for (let i = 0; start + i < s.length; i++) s[start + i] += a * Math.exp((-2.5 * i) / SR) * Math.sin((2 * Math.PI * f * i) / SR)
  }
  for (const { t, a = 0.4 } of clicks) {
    const start = Math.round(t * SR)
    for (let i = 0; i < 0.05 * SR; i++) s[start + i] += a * Math.exp((-100 * i) / SR) * Math.sin((2 * Math.PI * 1000 * i) / SR)
  }
  return s
}

/** Jak z mikrofonu: paczki po `chunk` próbek, odbiór ocen w trakcie. */
function detect(s: Float32Array, chunk = 1024, startFrame = 0): Onset[] {
  const d = createOnsetDetector(SR)
  const out: Onset[] = []
  for (let i = 0; i < s.length; i += chunk) {
    d.push(startFrame + i, s.subarray(i, i + chunk))
    out.push(...d.take())
  }
  return out
}

const notes = (o: Onset[]) => o.filter((x) => x.note)

describe('createOnsetDetector', () => {
  it('czas ataku co do ~2 ms i wysokość – od niskiej E do wysokiej nuty', () => {
    const plucks = [
      { t: 0.5, f: 82.41 },
      { t: 1.2, f: 196 },
      { t: 1.9, f: 329.6 },
      { t: 2.6, f: 784 },
    ]
    const found = notes(detect(signal(3.5, plucks)))
    expect(found).toHaveLength(plucks.length)
    found.forEach((o, i) => {
      expect(Math.abs(o.time - plucks[i].t)).toBeLessThan(0.002)
      expect(Math.abs(o.freq! - plucks[i].f) / plucks[i].f).toBeLessThan(0.02)
    })
  })

  it('ta sama nuta powtórzona na brzmiącej strunie – każde szarpnięcie osobno, także cichsze', () => {
    const plucks = [
      { t: 0.5, f: 82.41 },
      { t: 1.25, f: 82.41, a: 0.4 },
      { t: 2.0, f: 329.6 },
      { t: 2.75, f: 329.6, a: 0.35 },
    ]
    const found = notes(detect(signal(3.5, plucks)))
    expect(found.map((o) => Math.round(o.time * 100) / 100)).toEqual([0.5, 1.25, 2, 2.75])
  })

  it('szybka zmiana nut (ósemki w tempie 120), gdy poprzednia jeszcze głośno brzmi', () => {
    const plucks = [
      { t: 0.5, f: 196 },
      { t: 0.75, f: 220 },
      { t: 1.0, f: 247 },
    ]
    const found = notes(detect(signal(2, plucks)))
    expect(found.map((o) => Math.round(o.time * 100) / 100)).toEqual([0.5, 0.75, 1])
  })

  it('tyk metronomu sam – odrzucony jako krótki', () => {
    const all = detect(signal(1.5, [], [{ t: 0.5 }]))
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ note: false, reason: 'short' })
  })

  it('tyk 60 ms przed nutą – liczy się chwila nuty, tyk odrzucony', () => {
    const all = detect(signal(2, [{ t: 1.06, f: 196 }], [{ t: 1.0 }]))
    expect(all.map((o) => o.reason ?? 'nuta')).toEqual(['before-other', 'nuta'])
    expect(Math.abs(notes(all)[0].time - 1.06)).toBeLessThan(0.002)
  })

  it('cichy stuk tuż po głośnej nucie – nuta zostaje', () => {
    const all = detect(signal(2, [{ t: 0.5, f: 196, a: 0.6 }], [{ t: 0.57, a: 0.2 }]))
    expect(notes(all)).toHaveLength(1)
    expect(Math.abs(notes(all)[0].time - 0.5)).toBeLessThan(0.002)
  })

  it('cisza i szum poniżej progu – nic', () => {
    const s = new Float32Array(SR)
    for (let i = 0; i < s.length; i++) s[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1 * 0.005
    expect(detect(s)).toEqual([])
  })

  it('wynik nie zależy od wielkości paczek ani od numeru pierwszej próbki', () => {
    const s = signal(3, [
      { t: 0.5, f: 82.41 },
      { t: 1.25, f: 82.41, a: 0.4 },
      { t: 2, f: 440 },
    ], [{ t: 2.6 }])
    const a = detect(s, 1024)
    expect(detect(s, 128)).toEqual(a)
    expect(detect(s, 1000)).toEqual(a)
    const shifted = detect(s, 1024, 10 * SR)
    expect(shifted.map((o) => o.time - 10)).toEqual(a.map((o) => expect.closeTo(o.time, 9)))
  })

  it('take oddaje każde szarpnięcie raz – dopiero gdy jest ocenione', () => {
    const d = createOnsetDetector(SR)
    const s = signal(1, [{ t: 0.2, f: 196 }])
    d.push(0, s.subarray(0, Math.round(0.25 * SR)))
    expect(d.take()).toEqual([]) // za wcześnie na ocenę
    d.push(Math.round(0.25 * SR), s.subarray(Math.round(0.25 * SR)))
    expect(d.take()).toHaveLength(1)
    expect(d.take()).toEqual([])
  })
})
