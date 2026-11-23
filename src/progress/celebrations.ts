// Co świętujemy: porównanie stanu postępu „przed” i „po” nowych zdarzeniach.
// Czysta logika – hook w React tylko trzyma poprzedni stan i pokazuje wynik.
import type { ActivityEvent } from '../data/model'
import type { Badge } from './badges'
import { isCrown } from './events'
import type { ProfileProgress } from './progress'

export type Celebration =
  | { kind: 'goal' }
  | { kind: 'level'; level: number; name: string }
  | { kind: 'badge'; badge: Badge }
  | { kind: 'crown'; songId: string; crown: number }

export interface ProgressSnapshot {
  profileId: string
  day: string
  goalMetToday: boolean
  level: number
  badgeIds: ReadonlySet<string>
  /** Korony tej osoby: id zdarzenia → piosenka i numer korony. */
  crowns: ReadonlyMap<string, { songId: string; crown: number }>
}

export function snapshot(
  profileId: string,
  day: string,
  progress: ProfileProgress,
  badges: readonly Badge[],
  events: readonly ActivityEvent[],
): ProgressSnapshot {
  const crowns = new Map<string, { songId: string; crown: number }>()
  for (const e of events) if (isCrown(e) && e.profileId === profileId) crowns.set(e.id, { songId: e.songId, crown: e.crown })
  return {
    profileId,
    day,
    goalMetToday: progress.streak.goalMetToday,
    level: progress.level.level,
    badgeIds: new Set(badges.filter((b) => b.earnedOn).map((b) => b.id)),
    crowns,
  }
}

/**
 * Nowe nagrody między dwoma stanami – w kolejności: korona (to właśnie zagrano), cel, awans, odznaki.
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
  // Korona 2 od razu przychodzi razem z koroną 1 – świętujemy tylko najwyższą nową w piosence.
  const bestNew = new Map<string, number>()
  for (const [id, c] of next.crowns) {
    if (!prev.crowns.has(id)) bestNew.set(c.songId, Math.max(bestNew.get(c.songId) ?? 0, c.crown))
  }
  for (const [songId, crown] of bestNew) result.push({ kind: 'crown', songId, crown })
  if (next.goalMetToday && !prev.goalMetToday) result.push({ kind: 'goal' })
  if (next.level > prev.level) result.push({ kind: 'level', level: progress.level.level, name: progress.level.name })
  for (const badge of badges) {
    if (next.badgeIds.has(badge.id) && !prev.badgeIds.has(badge.id)) result.push({ kind: 'badge', badge })
  }
  return result
}
