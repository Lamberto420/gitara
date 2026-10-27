// Rodzaje zdarzeń postępu i ile nutek ⭐ za nie dajemy.
// Nutki zapisujemy W ZDARZENIU w chwili jego powstania – gdy kiedyś zmienimy punktację,
// nikt nie straci zdobytych nutek wstecz.
import { localDay, type ActivityEvent } from '../data/model'

export const XP_PER_PRACTICE_MINUTE = 2
export const XP_DAILY_GOAL = 10
/** Dodatkowa nutka za minutę gry z włączonym metronomem (czyli 3 zamiast 2). */
export const XP_METRONOME_BONUS_PER_MINUTE = 1
/** Raz dziennie za nastrojenie wszystkich 6 strun. */
export const XP_TUNED = 3

export interface PracticeEvent extends ActivityEvent {
  type: 'practice'
  /** Sekundy, w których mikrofon słyszał grę. */
  seconds: number
  xp: number
  /** Grane z włączonym metronomem – stąd bonus w xp. */
  metronome?: boolean
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

export function practiceEvent(profileId: string, seconds: number, now = new Date(), metronome = false): PracticeEvent {
  const minutes = Math.floor(seconds / 60)
  return {
    id: crypto.randomUUID(),
    profileId,
    at: now.getTime(),
    day: localDay(now),
    type: 'practice',
    seconds,
    xp: minutes * (XP_PER_PRACTICE_MINUTE + (metronome ? XP_METRONOME_BONUS_PER_MINUTE : 0)),
    ...(metronome && { metronome }),
  }
}

/**
 * Zdarzenie „cel dzienny spełniony”. Id wynika z osoby i dnia – gdy cel zostanie osiągnięty
 * na dwóch urządzeniach tego samego dnia, po połączeniu danych bonus liczy się tylko raz.
 */
export function goalEvent(profileId: string, day: string, now = new Date()): GoalEvent {
  return { id: `goal:${profileId}:${day}`, profileId, at: now.getTime(), day, type: 'goal', xp: XP_DAILY_GOAL }
}

export interface TunedEvent extends ActivityEvent {
  type: 'tuned'
  xp: number
}

/** „Cała gitara nastrojona” – id z osoby i dnia, więc nutki za strojenie wpadają raz dziennie. */
export function tunedEvent(profileId: string, now = new Date()): TunedEvent {
  const day = localDay(now)
  return { id: tunedEventId(profileId, day), profileId, at: now.getTime(), day, type: 'tuned', xp: XP_TUNED }
}

export function tunedEventId(profileId: string, day: string): string {
  return `tuned:${profileId}:${day}`
}
