// Runda gry „Zagraj nutę”: losowanie nut, przebieg (trafienie / pomyłka) i nutki ⭐ za wynik.
// Czyste funkcje – ekran tylko je wywołuje.
import { FIRST_POSITION, FIRST_POSITION_NATURALS, type FretNote } from '../music/firstPosition'

export const ROUND_LENGTH = 10

export type LevelId = 'easy' | 'hard'

export interface Level {
  id: LevelId
  name: string
  notes: readonly FretNote[]
  /** Gryf z miejscem palca od razu (podpowiedź) – na trudnym dopiero po trafieniu. */
  showFretboard: boolean
  /** Nutki za każdą nutę trafioną za pierwszym razem. */
  xpPerFirstTry: number
  /** Nutki za ukończenie rundy. */
  xpRound: number
}

/**
 * Łatwy: nuty bez krzyżyków, gryf podpowiada. Trudny: wszystkie 24 nuty, czytanie z samej
 * pięciolinii – dlatego dopiero tu nagradzamy każde trafienie za pierwszym razem.
 */
export const LEVELS: Record<LevelId, Level> = {
  easy: { id: 'easy', name: 'Łatwy', notes: FIRST_POSITION_NATURALS, showFretboard: true, xpPerFirstTry: 0, xpRound: 2 },
  hard: { id: 'hard', name: 'Trudny', notes: FIRST_POSITION, showFretboard: false, xpPerFirstTry: 1, xpRound: 2 },
}

/** Losuje `count` nut z puli; ta sama nuta nigdy dwa razy z rzędu (wyglądałoby jak zacięcie). */
export function pickNotes(pool: readonly FretNote[], count: number, random: () => number = Math.random): FretNote[] {
  const picked: FretNote[] = []
  for (let i = 0; i < count; i++) {
    const prev = picked[i - 1]
    const choices = prev ? pool.filter((n) => n.midi !== prev.midi) : pool
    picked.push(choices[Math.floor(random() * choices.length)])
  }
  return picked
}

export interface Round {
  level: LevelId
  notes: readonly FretNote[]
  /** Indeks bieżącej nuty; równy długości = runda skończona. */
  index: number
  /** Ile nut trafiono bez wcześniejszej pomyłki. */
  firstTry: number
  /** Czy przy bieżącej nucie była już pomyłka. */
  missed: boolean
}

export function newRound(level: LevelId, random: () => number = Math.random): Round {
  return { level, notes: pickNotes(LEVELS[level].notes, ROUND_LENGTH, random), index: 0, firstTry: 0, missed: false }
}

export const isFinished = (r: Round) => r.index >= r.notes.length
export const currentNote = (r: Round): FretNote | null => r.notes[r.index] ?? null

/** Trafiona bieżąca nuta – przejście do następnej. */
export function hit(r: Round): Round {
  if (isFinished(r)) return r
  return { ...r, index: r.index + 1, firstTry: r.firstTry + (r.missed ? 0 : 1), missed: false }
}

/** Zagrana inna nuta – bez kary, tylko ta nuta nie liczy się już „za pierwszym razem”. */
export function miss(r: Round): Round {
  return isFinished(r) ? r : { ...r, missed: true }
}

/** Nutki za ukończoną rundę. */
export function roundXp(level: LevelId, firstTry: number): number {
  const l = LEVELS[level]
  return l.xpRound + firstTry * l.xpPerFirstTry
}
