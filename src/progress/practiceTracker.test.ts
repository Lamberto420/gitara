import { describe, expect, it } from 'vitest'
import { HEARD_GRACE_MS, createPracticeTracker } from './practiceTracker'

const FRAME_MS = 33 // ~30 odczytów na sekundę, jak w aplikacji

/** Symuluje odczyty co FRAME_MS od `from` do `to` (ms) z tym samym stanem „słychać grę”. */
function feed(t: ReturnType<typeof createPracticeTracker>, from: number, to: number, heard: boolean) {
  for (let at = from; at <= to; at += FRAME_MS) t.update(at, heard)
}

describe('createPracticeTracker', () => {
  it('liczy czas, gdy słychać gitarę', () => {
    const t = createPracticeTracker()
    feed(t, 0, 10_000, true)
    expect(t.pendingSeconds()).toBe(9) // 9,99 s – pełne sekundy
  })

  it('cisza od początku się nie liczy', () => {
    const t = createPracticeTracker()
    feed(t, 0, 60_000, false)
    expect(t.pendingSeconds()).toBe(0)
  })

  it('krótka przerwa między nutami liczy się jako granie', () => {
    const t = createPracticeTracker()
    feed(t, 0, 5_000, true)
    feed(t, 5_033, 7_000, false) // 2 s ciszy
    feed(t, 7_033, 12_000, true)
    expect(t.pendingSeconds()).toBe(11)
    expect(t.isPlaying(7_000)).toBe(true)
  })

  it('długa cisza zatrzymuje licznik po okresie tolerancji', () => {
    const t = createPracticeTracker()
    feed(t, 0, 10_000, true)
    feed(t, 10_033, 70_000, false) // minuta ciszy
    expect(t.pendingSeconds()).toBe(10 + HEARD_GRACE_MS / 1000) // 10 s gry + 3 s tolerancji, potem stop
    expect(t.isPlaying(70_000)).toBe(false)
  })

  it('przerwa w odczytach (zgaszony ekran) nie dolicza się jako gra', () => {
    const t = createPracticeTracker()
    feed(t, 0, 1_000, true)
    t.update(600_000, true) // 10 min później – karta była w tle
    expect(t.pendingSeconds()).toBeLessThan(2)
  })

  it('zegar cofnięty wstecz nie odejmuje ani nie dodaje czasu', () => {
    const t = createPracticeTracker()
    feed(t, 10_000, 12_000, true)
    const before = t.pendingSeconds()
    t.update(5_000, true)
    expect(t.pendingSeconds()).toBe(before)
  })

  it('pełne minuty zabiera do zapisu, reszta czeka na koniec', () => {
    const t = createPracticeTracker()
    feed(t, 0, 150_000, true) // 2,5 min
    expect(t.takeFullMinutes()).toBe(2)
    expect(t.takeFullMinutes()).toBe(0)
    expect(t.pendingSeconds()).toBe(29)
    expect(t.takeRest()).toBe(29)
    expect(t.pendingSeconds()).toBe(0)
  })
})
