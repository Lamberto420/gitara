// Rodzaje zdarzeń postępu i ile nutek ⭐ za nie dajemy.
// Nutki zapisujemy W ZDARZENIU w chwili jego powstania – gdy kiedyś zmienimy punktację,
// nikt nie straci zdobytych nutek wstecz.
import { localDay, type ActivityEvent } from '../data/model'

export const XP_PER_PRACTICE_MINUTE = 2
export const XP_DAILY_GOAL = 10

export interface PracticeEvent extends ActivityEvent {
  type: 'practice'
  /** Sekundy, w których mikrofon słyszał grę. */
  seconds: number
  xp: number
}

export interface GoalEvent extends ActivityEvent {
  type: 'goal'
  xp: number
}

export function isPractice(e: ActivityEvent): e is PracticeEvent {
  return e.type === 'practice' && typeof e.seconds === 'number'
}

export function isGoal(e: ActivityEvent): e is GoalEvent {
  return e.type === 'goal'
}

/** Nutki z dowolnego zdarzenia (nieznane typy z nowszych wersji = 0, ale nie psują obliczeń). */
export function eventXp(e: ActivityEvent): number {
  return typeof e.xp === 'number' && e.xp > 0 ? e.xp : 0
}

export function practiceEvent(profileId: string, seconds: number, now = new Date()): PracticeEvent {
  return {
    id: crypto.randomUUID(),
    profileId,
    at: now.getTime(),
    day: localDay(now),
    type: 'practice',
    seconds,
    xp: Math.floor(seconds / 60) * XP_PER_PRACTICE_MINUTE,
  }
}

/**
 * Zdarzenie „cel dzienny spełniony”. Id wynika z osoby i dnia – gdy cel zostanie osiągnięty
 * na dwóch urządzeniach tego samego dnia, po połączeniu danych bonus liczy się tylko raz.
 */
export function goalEvent(profileId: string, day: string, now = new Date()): GoalEvent {
  return { id: `goal:${profileId}:${day}`, profileId, at: now.getTime(), day, type: 'goal', xp: XP_DAILY_GOAL }
}
