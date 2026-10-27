import { describe, expect, it } from 'vitest'
import { clampBpm, createScheduler, type Beat } from './scheduler'

/** Sztuczny zegar: symulujemy timer, który „tyka” co `step()` sekund przez `duration` sekund. */
function run(options: { bpm: number; beatsPerBar: number }, duration: number, step: () => number = () => 0.025) {
  let t = 0
  const beats: Beat[] = []
  const scheduler = createScheduler({ ...options, now: () => t, playBeat: (b) => beats.push(b) })
  scheduler.start()
  const advanceTo = (end: number) => {
    while (t < end) {
      scheduler.tick()
      t += step()
    }
  }
  advanceTo(duration)
  return { beats, scheduler, advanceTo, setTime: (value: number) => (t = value) }
}

function intervals(beats: Beat[]) {
  return beats.slice(1).map((b, i) => b.time - beats[i].time)
}

describe('scheduler', () => {
  it('120 BPM = uderzenie co 0,5 s, akcent co 4 uderzenia', () => {
    const { beats } = run({ bpm: 120, beatsPerBar: 4 }, 3)
    expect(beats.length).toBeGreaterThanOrEqual(6)
    intervals(beats).forEach((dt) => expect(dt).toBeCloseTo(0.5, 9))
    expect(beats.map((b) => b.index)).toEqual(beats.map((_, i) => i % 4))
    expect(beats.filter((b) => b.accent).map((b) => b.index)).toEqual(
      beats.filter((_, i) => i % 4 === 0).map(() => 0),
    )
  })

  it('nieregularny timer nie psuje rytmu (czasy liczone z zegara audio)', () => {
    let seed = 7
    const jitter = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return 0.01 + (seed / 2 ** 31) * 0.06 // 10–70 ms między tyknięciami
    }
    const { beats } = run({ bpm: 90, beatsPerBar: 3 }, 5, jitter)
    intervals(beats).forEach((dt) => expect(dt).toBeCloseTo(60 / 90, 9))
    // żadne uderzenie nie zaplanowane dwa razy
    expect(new Set(beats.map((b) => b.time)).size).toBe(beats.length)
  })

  it('planuje dźwięki tylko w przyszłości i nie dalej niż lookahead', () => {
    let t = 0
    const scheduled: { at: number; beat: Beat }[] = []
    const s = createScheduler({ bpm: 200, beatsPerBar: 4, now: () => t, playBeat: (beat) => scheduled.push({ at: t, beat }) })
    s.start()
    for (; t < 2; t += 0.025) s.tick()
    scheduled.forEach(({ at, beat }) => {
      expect(beat.time).toBeGreaterThanOrEqual(at)
      expect(beat.time).toBeLessThan(at + 0.1)
    })
  })

  it('po powrocie z tła pomija zaległe uderzenia, ale akcent dalej wypada na „raz”', () => {
    const { beats, setTime, advanceTo } = run({ bpm: 120, beatsPerBar: 4 }, 1)
    const before = beats.length
    setTime(10.01) // karta w tle przez ~9 s
    advanceTo(11)
    const after = beats.slice(before)
    expect(after.every((b) => b.time >= 10.01)).toBe(true)
    expect(after.length).toBeLessThanOrEqual(3) // brak „serii” zaległych kliknięć
    // pierwszy beat był w 0,05 s, więc „raz” wypada w 0,05 + 2·k sekund
    after.forEach((b) => expect(b.accent).toBe(Math.abs(((b.time - 0.05) / 2) % 1) < 1e-6))
  })

  it('zmiana tempa działa od następnego uderzenia', () => {
    const { beats, scheduler, advanceTo } = run({ bpm: 60, beatsPerBar: 4 }, 2)
    const before = beats.length
    scheduler.setBpm(120)
    advanceTo(5)
    const dts = intervals(beats.slice(before - 1))
    expect(dts[0]).toBeCloseTo(1, 9) // uderzenie zaplanowane wcześniej zostaje
    dts.slice(1).forEach((dt) => expect(dt).toBeCloseTo(0.5, 9))
  })

  it('zmiana metrum w trakcie gry', () => {
    const { beats, scheduler, advanceTo } = run({ bpm: 120, beatsPerBar: 4 }, 1.2)
    scheduler.setBeatsPerBar(3)
    const before = beats.length
    advanceTo(5)
    expect(beats.slice(before).every((b) => b.index < 3)).toBe(true)
  })

  it('ogranicza tempo do 40–208', () => {
    expect(clampBpm(10)).toBe(40)
    expect(clampBpm(300)).toBe(208)
    expect(clampBpm(99.6)).toBe(100)
  })
})
