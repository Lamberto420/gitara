import { describe, expect, it } from 'vitest'
import { newProfile, type ActivityEvent } from '../data/model'
import { computeBadges } from './badges'
import { addDays } from './days'
import { goalEvent, noteGameEvent, practiceEvent, tunedEvent } from './events'

const TODAY = '2026-10-27'
const kuba = newProfile({ name: 'Kuba', avatar: '🦊', color: '#f80', dailyGoalMinutes: 10 }, 1, 'kuba')
const tata = newProfile({ name: 'Tata', avatar: '🐻', color: '#38f', dailyGoalMinutes: 15 }, 2, 'tata')

/** Data lokalna `offset` dni od dziś, o podanej godzinie. */
const at = (offset: number, hour = 18) => {
  const [y, m, d] = addDays(TODAY, offset).split('-').map(Number)
  return new Date(y, m - 1, d, hour)
}
const play = (who: string, offset: number, minutes: number, hour = 18, metronome = false) =>
  practiceEvent(who, minutes * 60, at(offset, hour), metronome)
const game = (who: string, offset: number, level: string, firstTry: number) =>
  noteGameEvent(who, { level, notes: 10, firstTry, xp: 0 }, at(offset))
const goal = (who: string, offset: number) => goalEvent(who, addDays(TODAY, offset), at(offset))

function earned(events: ActivityEvent[], profiles = [kuba]) {
  return Object.fromEntries(computeBadges(events, kuba, profiles, TODAY).map((b) => [b.id, b.earnedOn]))
}

describe('computeBadges', () => {
  it('nowa osoba: wszystko niezdobyte, bez odznaki rodzinnej przy jednej osobie', () => {
    const badges = computeBadges([], kuba, [kuba], TODAY)
    expect(badges.every((b) => b.earnedOn === null)).toBe(true)
    expect(badges.map((b) => b.id)).not.toContain('family-3')
    expect(computeBadges([], kuba, [kuba, tata], TODAY).map((b) => b.id)).toContain('family-3')
  })

  it('czas grania: dzień, w którym suma przekroczyła próg', () => {
    const e = earned([play('kuba', -3, 20), play('kuba', -2, 15), play('kuba', -1, 30), play('tata', -5, 600)])
    expect(e['play-1m']).toBe(addDays(TODAY, -3))
    expect(e['play-30m']).toBe(addDays(TODAY, -2)) // 20 + 15 ≥ 30
    expect(e['play-1h']).toBe(addDays(TODAY, -1)) // 65 min
    expect(e['play-5h']).toBeNull() // minuty taty się nie liczą
  })

  it('zdarzenia z kilku urządzeń w dowolnej kolejności – liczy się kolejność w czasie', () => {
    const e = earned([play('kuba', -1, 30), play('kuba', -3, 1)])
    expect(e['play-1m']).toBe(addDays(TODAY, -3))
  })

  it('seria: zdobyta odznaka zostaje po przerwaniu serii', () => {
    const events = [goal('kuba', -10), goal('kuba', -9), goal('kuba', -8)] // potem przerwa
    const e = earned(events)
    expect(e['streak-3']).toBe(addDays(TODAY, -8))
    expect(e['streak-7']).toBeNull()
    expect(e['goals-1']).toBe(addDays(TODAY, -10))
  })

  it('10 celów i 10 dni strojenia', () => {
    const events: ActivityEvent[] = []
    for (let i = 20; i >= 1; i -= 2) events.push(goal('kuba', -i), tunedEvent('kuba', at(-i)))
    const e = earned(events)
    expect(e['goals-10']).toBe(addDays(TODAY, -2))
    expect(e['tuned-1']).toBe(addDays(TODAY, -20))
    expect(e['tuned-10']).toBe(addDays(TODAY, -2))
  })

  it('metronom: liczy się tylko granie z metronomem', () => {
    expect(earned([play('kuba', -2, 60)])['metronome-30m']).toBeNull()
    expect(earned([play('kuba', -2, 20, 18, true), play('kuba', -1, 10, 18, true)])['metronome-30m']).toBe(
      addDays(TODAY, -1),
    )
  })

  it('ranny ptaszek: granie przed 8:00', () => {
    expect(earned([play('kuba', -1, 5, 8)])['early-bird']).toBeNull()
    expect(earned([play('kuba', -1, 5, 7)])['early-bird']).toBe(addDays(TODAY, -1))
  })

  it('rodzinny zespół: 3 dni z rzędu, w których wszyscy spełnili cel', () => {
    const both = (offset: number) => [goal('kuba', offset), goal('tata', offset)]
    const almost = [...both(-6), ...both(-5), goal('kuba', -4)] // tata nie zagrał 3. dnia
    expect(earned(almost, [kuba, tata])['family-3']).toBeNull()
    expect(earned([...almost, ...both(-2), ...both(-1), ...both(0)], [kuba, tata])['family-3']).toBe(TODAY)
  })

  it('gra: pierwsza runda, 10 rund, bezbłędna runda i bezbłędna na trudnym', () => {
    const rounds = [game('kuba', -5, 'easy', 7), game('kuba', -4, 'easy', 10), game('kuba', -3, 'hard', 9), game('tata', -6, 'hard', 10)]
    const e = earned(rounds)
    expect(e['game-1']).toBe(addDays(TODAY, -5))
    expect(e['game-perfect']).toBe(addDays(TODAY, -4))
    expect(e['game-hard-perfect']).toBeNull() // 9/10 to nie bezbłędnie, a runda taty się nie liczy
    expect(e['game-10']).toBeNull()

    const more = [...rounds, ...Array.from({ length: 6 }, (_, i) => game('kuba', -2, 'easy', 5 + i)), game('kuba', -1, 'hard', 10)]
    expect(earned(more)['game-10']).toBe(addDays(TODAY, -1)) // 3 + 6 + 1 = 10. runda
    expect(earned(more)['game-hard-perfect']).toBe(addDays(TODAY, -1))
  })
})
