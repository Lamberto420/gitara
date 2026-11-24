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

export interface NoteGameEvent extends ActivityEvent {
  type: 'note-game'
  /** Poziom gry („easy” / „hard”) – zapisany jako tekst, żeby stare dane przetrwały nowe poziomy. */
  level: string
  /** Liczba nut w rundzie. */
  notes: number
  /** Ile nut trafiono za pierwszym razem. */
  firstTry: number
  xp: number
}

export function isNoteGame(e: ActivityEvent): e is NoteGameEvent {
  return e.type === 'note-game' && typeof e.notes === 'number' && typeof e.firstTry === 'number'
}

/** Ukończona runda gry „Zagraj nutę”. Nutki liczy gra (zależą od poziomu) i zapisujemy je tutaj. */
export function noteGameEvent(
  profileId: string,
  result: { level: string; notes: number; firstTry: number; xp: number },
  now = new Date(),
): NoteGameEvent {
  return { id: crypto.randomUUID(), profileId, at: now.getTime(), day: localDay(now), type: 'note-game', ...result }
}

/** Wynik podejścia do piosenki – to, co zapisujemy w zdarzeniu `song`. */
export interface SongResult {
  songId: string
  /** „song” = cała piosenka, liczba = numer frazy. */
  scope: 'song' | number
  /** Tryb jako tekst („fretboard” / „staff” / „rhythm”) – stare dane przetrwają nowe tryby. */
  mode: string
  /** Gra w rytmie: tempo w procentach tempa piosenki (korona 3 tylko przy 100). */
  tempo?: number
  notes: number
  firstTry: number
  /** Korona, na którą zasłużyło to podejście (0 = żadna) – sama korona to osobne zdarzenie. */
  crown: number
  xp: number
}

export interface SongPlayEvent extends ActivityEvent, SongResult {
  type: 'song'
}

export function isSongPlay(e: ActivityEvent): e is SongPlayEvent {
  return e.type === 'song' && typeof e.songId === 'string' && typeof e.crown === 'number'
}

/** Skończone podejście do frazy albo całej piosenki. */
export function songPlayEvent(
  profileId: string,
  result: SongResult,
  now = new Date(),
): SongPlayEvent {
  return { id: crypto.randomUUID(), profileId, at: now.getTime(), day: localDay(now), type: 'song', ...result }
}

/** Premia za nową koronę 👑 – raz na koronę. */
export const XP_CROWN = 5

export interface CrownEvent extends ActivityEvent {
  type: 'crown'
  songId: string
  /** Numer korony (1–3). */
  crown: number
  xp: number
}

export function isCrown(e: ActivityEvent): e is CrownEvent {
  return e.type === 'crown' && typeof e.songId === 'string' && typeof e.crown === 'number'
}

/**
 * Zdobyta korona. Id z osoby, piosenki i numeru korony – zdobyta na dwóch urządzeniach
 * liczy się po połączeniu danych raz (tak jak cel dzienny).
 */
export function crownEvent(profileId: string, songId: string, crown: number, now = new Date()): CrownEvent {
  return {
    id: `crown:${profileId}:${songId}:${crown}`,
    profileId,
    at: now.getTime(),
    day: localDay(now),
    type: 'crown',
    songId,
    crown,
    xp: XP_CROWN,
  }
}

export interface SongUnlockEvent extends ActivityEvent {
  type: 'song-unlock'
  songId: string
}

export function isSongUnlock(e: ActivityEvent): e is SongUnlockEvent {
  return e.type === 'song-unlock' && typeof e.songId === 'string'
}

/** Ręczne odblokowanie piosenki na ścieżce (np. nauczyciel każe ją przećwiczyć) – bez nutek. */
export function songUnlockEvent(profileId: string, songId: string, now = new Date()): SongUnlockEvent {
  return {
    id: `song-unlock:${profileId}:${songId}`,
    profileId,
    at: now.getTime(),
    day: localDay(now),
    type: 'song-unlock',
    songId,
  }
}
