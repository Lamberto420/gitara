// Postęp wyliczany z logu zdarzeń (czyste funkcje – nic nie zapisują).
import { localDay, type ActivityEvent, type Profile } from '../data/model'
import { eventXp, goalEvent, isGoal, isPractice, type GoalEvent } from './events'
import { levelFor, type LevelInfo } from './levels'
import { computeStreak, consecutiveDays, type StreakInfo } from './streak'

export interface ProfileProgress {
  xp: number
  level: LevelInfo
  todaySeconds: number
  goalSeconds: number
  streak: StreakInfo
}

function eventsOf(events: readonly ActivityEvent[], profileId: string) {
  return events.filter((e) => e.profileId === profileId)
}

function goalDays(events: readonly ActivityEvent[]): Set<string> {
  return new Set(events.filter(isGoal).map((e) => e.day))
}

export function computeProgress(events: readonly ActivityEvent[], profile: Profile, today: string): ProfileProgress {
  const mine = eventsOf(events, profile.id)
  const xp = mine.reduce((sum, e) => sum + eventXp(e), 0)
  return {
    xp,
    level: levelFor(xp),
    todaySeconds: mine.filter((e) => isPractice(e) && e.day === today).reduce((s, e) => s + (e.seconds as number), 0),
    goalSeconds: profile.dailyGoalMinutes * 60,
    streak: computeStreak(goalDays(mine), today),
  }
}

/** Zdarzenie „cel spełniony”, jeśli dziś właśnie go osiągnięto i jeszcze nie zapisano. */
export function pendingGoalEvent(events: readonly ActivityEvent[], profile: Profile, now = new Date()): GoalEvent | null {
  const today = localDay(now)
  const progress = computeProgress(events, profile, today)
  if (progress.streak.goalMetToday || progress.todaySeconds < progress.goalSeconds) return null
  return goalEvent(profile.id, today, now)
}

/**
 * Rodzinna seria: dni, w których KAŻDA osoba spełniła cel (albo uratowała dzień ochroną 🧊).
 * Ma sens od dwóch osób – dla jednej zwraca null.
 */
export function familyStreak(events: readonly ActivityEvent[], profiles: readonly Profile[], today: string): number | null {
  if (profiles.length < 2) return null
  const perProfile = profiles.map((p) => {
    const mine = eventsOf(events, p.id)
    const days = goalDays(mine)
    for (const d of computeStreak(days, today).frozenDays) days.add(d)
    return days
  })
  const [first, ...rest] = perProfile
  const shared = new Set([...first].filter((d) => rest.every((days) => days.has(d))))
  return consecutiveDays(shared, today)
}
