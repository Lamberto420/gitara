// Ścieżka piosenek: korony 👑 i odblokowane piosenki osoby – wyliczane ze zdarzeń, nigdy zapisywane
// jako gotowy stan (patrz model.ts). Czyste funkcje.
import type { ActivityEvent } from '../data/model'
import { crownEvent, isCrown, isSongUnlock, songPlayEvent, type SongResult } from './events'

/** Najwyższa korona osoby w każdej piosence (brak wpisu = 0). */
export function crownsBySong(events: readonly ActivityEvent[], profileId: string): Map<string, number> {
  const crowns = new Map<string, number>()
  for (const e of events) {
    if (e.profileId !== profileId || !isCrown(e)) continue
    crowns.set(e.songId, Math.max(crowns.get(e.songId) ?? 0, e.crown))
  }
  return crowns
}

export interface PathStep {
  songId: string
  crown: number
  unlocked: boolean
  /** Odblokowana ręcznie (bez korony w poprzedniej) – na ekranie bez kłódki, ale z innym opisem. */
  manual: boolean
}

/**
 * Stan ścieżki: pierwsza piosenka zawsze otwarta, każda następna – po pierwszej koronie
 * w poprzedniej albo po ręcznym odblokowaniu. Korona w dalszej piosence (np. z innego
 * urządzenia) też ją otwiera – zdobytego nie zamykamy.
 */
export function songPath(songIds: readonly string[], events: readonly ActivityEvent[], profileId: string): PathStep[] {
  const crowns = crownsBySong(events, profileId)
  const unlocks = new Set(events.filter((e) => e.profileId === profileId && isSongUnlock(e)).map((e) => e.songId as string))
  return songIds.map((songId, i) => {
    const crown = crowns.get(songId) ?? 0
    const byPath = i === 0 || (crowns.get(songIds[i - 1]) ?? 0) >= 1 || crown >= 1
    return { songId, crown, unlocked: byPath || unlocks.has(songId), manual: !byPath && unlocks.has(songId) }
  })
}

/**
 * Zdarzenia po skończonym podejściu: samo podejście (nutki za frazę/całość) i każda NOWA korona
 * do zasłużonej włącznie (od razu 👑2 = też 👑1). Korony już zdobyte nie dają nutek drugi raz.
 */
export function songResultEvents(
  profileId: string,
  result: SongResult,
  events: readonly ActivityEvent[],
  now = new Date(),
): ActivityEvent[] {
  const had = crownsBySong(events, profileId).get(result.songId) ?? 0
  const out: ActivityEvent[] = [songPlayEvent(profileId, result, now)]
  for (let c = had + 1; c <= result.crown; c++) out.push(crownEvent(profileId, result.songId, c, now))
  return out
}
