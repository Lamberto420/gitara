import { describe, expect, it } from 'vitest'
import { createTapTempo } from './tapTempo'

describe('tapTempo', () => {
  it('pierwsze stuknięcie nie daje tempa, kolejne co 500 ms = 120 BPM', () => {
    const tapper = createTapTempo()
    expect(tapper.tap(0)).toBeNull()
    expect(tapper.tap(500)).toBe(120)
    expect(tapper.tap(1000)).toBe(120)
  })

  it('uśrednia nierówne stuknięcia', () => {
    const tapper = createTapTempo()
    ;[0, 480, 1010, 1490].forEach((t) => tapper.tap(t))
    expect(tapper.tap(2000)).toBe(120) // średnio 500 ms
  })

  it('liczy tylko ostatnie 4 odstępy – szybko dopasowuje się do nowego tempa', () => {
    const tapper = createTapTempo()
    ;[0, 1000, 2000, 3000].forEach((t) => tapper.tap(t)) // 60 BPM
    let bpm: number | null = null
    for (let t = 3500; t <= 5000; t += 500) bpm = tapper.tap(t) // teraz 120 BPM
    expect(bpm).toBe(120)
  })

  it('przerwa dłuższa niż 2 s zaczyna od nowa', () => {
    const tapper = createTapTempo()
    tapper.tap(0)
    tapper.tap(1000)
    expect(tapper.tap(5000)).toBeNull()
    expect(tapper.tap(5400)).toBe(150)
  })

  it('wynik mieści się w zakresie metronomu', () => {
    const tapper = createTapTempo()
    tapper.tap(0)
    expect(tapper.tap(100)).toBe(208)
  })
})
