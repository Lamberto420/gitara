import { describe, expect, it } from 'vitest'
import { newProfile, type ActivityEvent } from '../data/model'
import { addDays } from './days'
import { XP_DAILY_GOAL, goalEvent, practiceEvent } from './events'
import { computeProgress, familyStreak, pendingGoalEvent } from './progress'

const TODAY = '2026-10-27'
const NOW = new Date(2026, 9, 27, 18, 0) // 27.10, 18:00 czasu lokalnego
const kuba = newProfile({ name: 'Kuba', avatar: '🦊', color: '#f80', dailyGoalMinutes: 10 }, 1, 'kuba')
const tata = newProfile({ name: 'Tata', avatar: '🐻', color: '#38f', dailyGoalMinutes: 15 }, 2, 'tata')

/** Ćwiczenie danego dnia (offset względem dziś) o długości `minutes`. */
function practice(profileId: string, offset: number, minutes: number): ActivityEvent {
  return { ...practiceEvent(profileId, minutes * 60), day: addDays(TODAY, offset) }
}

const goal = (profileId: string, offset: number) => goalEvent(profileId, addDays(TODAY, offset))

describe('computeProgress', () => {
  it('nowa osoba: zero wszystkiego, poziom 1', () => {
    expect(computeProgress([], kuba, TODAY)).toMatchObject({
      xp: 0,
      level: { level: 1 },
      todaySeconds: 0,
      goalSeconds: 600,
      streak: { streak: 0 },
    })
  })

  it('sumuje nutki i dzisiejsze minuty tylko tej osoby', () => {
    const events = [practice('kuba', 0, 4), practice('kuba', 0, 3), practice('kuba', -1, 10), practice('tata', 0, 30)]
    const p = computeProgress(events, kuba, TODAY)
    expect(p.todaySeconds).toBe(7 * 60)
    expect(p.xp).toBe((4 + 3 + 10) * 2)
  })

  it('nieznane zdarzenia (z przyszłej wersji) nie psują obliczeń', () => {
    const weird: ActivityEvent = { id: 'x', profileId: 'kuba', at: 1, day: TODAY, type: 'cos-nowego', xp: 'dużo' }
    expect(computeProgress([weird], kuba, TODAY).xp).toBe(0)
  })
})

describe('pendingGoalEvent', () => {
  it('brak zdarzenia, dopóki cel nie jest osiągnięty', () => {
    expect(pendingGoalEvent([practice('kuba', 0, 9)], kuba, NOW)).toBeNull()
  })

  it('cel osiągnięty → jedno zdarzenie z bonusem, z id zależnym od osoby i dnia', () => {
    const e = pendingGoalEvent([practice('kuba', 0, 6), practice('kuba', 0, 4)], kuba, NOW)
    expect(e).toMatchObject({ id: `goal:kuba:${TODAY}`, type: 'goal', day: TODAY, xp: XP_DAILY_GOAL })
  })

  it('drugi raz tego samego dnia już nie', () => {
    const events = [practice('kuba', 0, 10), goal('kuba', 0), practice('kuba', 0, 5)]
    expect(pendingGoalEvent(events, kuba, NOW)).toBeNull()
  })

  it('zmiana celu na wyższy nie odbiera spełnionych dni (seria liczona ze zdarzeń „goal”)', () => {
    const events = [practice('kuba', -1, 10), goal('kuba', -1)]
    const harder = { ...kuba, dailyGoalMinutes: 20 }
    expect(computeProgress(events, harder, TODAY).streak.streak).toBe(1)
  })
})

describe('familyStreak', () => {
  it('jedna osoba – brak rodzinnej serii', () => {
    expect(familyStreak([], [kuba], TODAY)).toBeNull()
  })

  it('liczą się dni, w których obie osoby spełniły cel', () => {
    const events = [goal('kuba', -2), goal('tata', -2), goal('kuba', -1), goal('tata', -1), goal('kuba', 0)]
    expect(familyStreak(events, [kuba, tata], TODAY)).toBe(2) // dziś tata jeszcze nie ćwiczył – seria trwa
  })

  it('dzień, w którym tata nie ćwiczył, przerywa rodzinną serię', () => {
    const events = [goal('kuba', -2), goal('tata', -2), goal('kuba', -1), goal('kuba', 0), goal('tata', 0)]
    expect(familyStreak(events, [kuba, tata], TODAY)).toBe(1)
  })

  it('dzień uratowany ochroną 🧊 jednej osoby nie przerywa rodzinnej serii', () => {
    // Obaj 7 dni z rzędu (każdy dostaje ochronę), potem tata opuszcza wczoraj, dziś obaj ćwiczą.
    const events: ActivityEvent[] = []
    for (let d = -8; d <= -2; d++) events.push(goal('kuba', d), goal('tata', d))
    events.push(goal('kuba', -1), goal('kuba', 0), goal('tata', 0))
    expect(computeProgress(events, tata, TODAY).streak.frozenDays).toEqual([addDays(TODAY, -1)])
    expect(familyStreak(events, [kuba, tata], TODAY)).toBe(9)
  })
})
