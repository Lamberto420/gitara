import { addDays, daysBetween } from './days'

/** Co tyle dni serii dostaje się ochronę 🧊. */
export const FREEZE_EVERY = 7
export const MAX_FREEZES = 2

export interface StreakInfo {
  /** Liczba dni ze spełnionym celem w obecnej serii. */
  streak: number
  /** Ochrony serii do wykorzystania. */
  freezes: number
  /** Dni uratowane ochroną – seria trwa, ale się nie zwiększa. */
  frozenDays: string[]
  /** Najdłuższa seria w historii. */
  best: number
  /** reachedOn[n − 1] = dzień, w którym seria pierwszy raz doszła do n dni (do odznak). */
  reachedOn: string[]
  goalMetToday: boolean
}

/**
 * Seria liczona dzień po dniu od pierwszego spełnionego celu do dziś.
 * Brak celu w danym dniu: zużywa ochronę, a gdy jej nie ma – seria spada do zera.
 * Dzisiejszy dzień jeszcze trwa, więc jego brak nie przerywa serii.
 */
export function computeStreak(goalDays: ReadonlySet<string>, today: string): StreakInfo {
  const result: StreakInfo = { streak: 0, freezes: 0, frozenDays: [], best: 0, reachedOn: [], goalMetToday: goalDays.has(today) }
  if (goalDays.size === 0) return result
  const first = [...goalDays].sort()[0]

  for (const day of daysBetween(first, today)) {
    if (goalDays.has(day)) {
      result.streak++
      if (result.streak > result.best) {
        result.best = result.streak
        result.reachedOn.push(day)
      }
      if (result.streak % FREEZE_EVERY === 0) result.freezes = Math.min(MAX_FREEZES, result.freezes + 1)
    } else if (day === today) {
      // dzień jeszcze trwa – czekamy
    } else if (result.freezes > 0) {
      result.freezes--
      result.frozenDays.push(day)
    } else {
      result.streak = 0
    }
  }
  return result
}

/**
 * Ile dni z rzędu (do dziś lub do wczoraj, jeśli dziś jeszcze nie) każdy dzień należy do zbioru.
 * Używane dla rodzinnej serii.
 */
export function consecutiveDays(days: ReadonlySet<string>, today: string): number {
  let day = days.has(today) ? today : addDays(today, -1)
  let count = 0
  while (days.has(day)) {
    count++
    day = addDays(day, -1)
  }
  return count
}
