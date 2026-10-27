import { describe, expect, it } from 'vitest'
import { addDays } from './days'
import { computeStreak, consecutiveDays } from './streak'

const TODAY = '2026-10-27'

/** Kalendarz z „x” (cel spełniony) i „.” (brak), ostatni znak = dziś. Np. 'xx.x'. */
function calendar(pattern: string): Set<string> {
  const days = new Set<string>()
  ;[...pattern].forEach((c, i) => {
    if (c === 'x') days.add(addDays(TODAY, i - (pattern.length - 1)))
  })
  return days
}

const streakOf = (pattern: string) => computeStreak(calendar(pattern), TODAY)

describe('computeStreak', () => {
  it('brak historii = zero', () => {
    expect(streakOf('')).toMatchObject({ streak: 0, freezes: 0, best: 0, goalMetToday: false })
  })

  it('kolejne dni zwiększają serię', () => {
    expect(streakOf('xxx')).toMatchObject({ streak: 3, goalMetToday: true })
  })

  it('dziś jeszcze nie ćwiczył – seria do wczoraj trwa', () => {
    expect(streakOf('xxx.')).toMatchObject({ streak: 3, goalMetToday: false })
  })

  it('przerwa bez ochrony zeruje serię, ale najlepsza zostaje zapamiętana', () => {
    expect(streakOf('xxxx.x')).toMatchObject({ streak: 1, best: 4 })
    expect(streakOf('xxx..')).toMatchObject({ streak: 0, best: 3 })
  })

  it('7 dni serii daje ochronę, która ratuje jeden opuszczony dzień', () => {
    expect(streakOf('xxxxxxx')).toMatchObject({ streak: 7, freezes: 1 })
    const saved = streakOf('xxxxxxx.x')
    expect(saved).toMatchObject({ streak: 8, freezes: 0, frozenDays: [addDays(TODAY, -1)] })
  })

  it('ochrona nie pomoże na dwa dni przerwy, gdy jest tylko jedna', () => {
    expect(streakOf('xxxxxxx..x')).toMatchObject({ streak: 1, freezes: 0 })
  })

  it('najwyżej 2 ochrony, nawet po 21 dniach', () => {
    expect(streakOf('x'.repeat(21))).toMatchObject({ streak: 21, freezes: 2 })
    expect(streakOf('x'.repeat(21) + '..x')).toMatchObject({ streak: 22, freezes: 0 })
  })

  it('dni po „dziś” (np. zły zegar na innym urządzeniu) są ignorowane', () => {
    const days = calendar('xx')
    days.add(addDays(TODAY, 3))
    expect(computeStreak(days, TODAY)).toMatchObject({ streak: 2 })
  })
})

describe('consecutiveDays', () => {
  it('liczy do dziś albo do wczoraj, jeśli dziś jeszcze nie', () => {
    expect(consecutiveDays(calendar('xxx'), TODAY)).toBe(3)
    expect(consecutiveDays(calendar('xxx.'), TODAY)).toBe(3)
    expect(consecutiveDays(calendar('xx..'), TODAY)).toBe(0)
    expect(consecutiveDays(calendar('x.xx'), TODAY)).toBe(2)
  })
})
