// Co świętujemy: porównanie stanu postępu „przed” i „po” nowych zdarzeniach.
// Czysta logika – hook w React tylko trzyma poprzedni stan i pokazuje wynik.
import type { Badge } from './badges'
import type { ProfileProgress } from './progress'

export type Celebration =
  | { kind: 'goal' }
  | { kind: 'level'; level: number; name: string }
  | { kind: 'badge'; badge: Badge }

export interface ProgressSnapshot {
  profileId: string
  day: string
  goalMetToday: boolean
  level: number
  badgeIds: ReadonlySet<string>
}

export function snapshot(profileId: string, day: string, progress: ProfileProgress, badges: readonly Badge[]): ProgressSnapshot {
  return {
    profileId,
    day,
    goalMetToday: progress.streak.goalMetToday,
    level: progress.level.level,
    badgeIds: new Set(badges.filter((b) => b.earnedOn).map((b) => b.id)),
  }
}

/**
 * Nowe nagrody między dwoma stanami – w kolejności: cel, awans, odznaki.
 * Brak poprzedniego stanu (start aplikacji), inna osoba albo nowy dzień = nic do świętowania:
 * wtedy różnica nie wynika z tego, co ktoś właśnie zagrał.
 */
export function newCelebrations(
  prev: ProgressSnapshot | null,
  next: ProgressSnapshot,
  progress: ProfileProgress,
  badges: readonly Badge[],
): Celebration[] {
  if (!prev || prev.profileId !== next.profileId || prev.day !== next.day) return []
  const result: Celebration[] = []
  if (next.goalMetToday && !prev.goalMetToday) result.push({ kind: 'goal' })
  if (next.level > prev.level) result.push({ kind: 'level', level: progress.level.level, name: progress.level.name })
  for (const badge of badges) {
    if (next.badgeIds.has(badge.id) && !prev.badgeIds.has(badge.id)) result.push({ kind: 'badge', badge })
  }
  return result
}
