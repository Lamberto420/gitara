// Przebieg piosenki: granie frazy albo całości nuta po nucie, trafienia, pomyłki, podpowiedź,
// a na końcu wynik – nutki ⭐ i korona 👑, na którą to podejście zasługuje.
// Czyste funkcje – ekran tylko je wywołuje. Korony zdobyte w historii wylicza silnik postępu.
import { phraseNotes, type Song, type SongNote } from '../music/song'

/** Z gryfem: miejsce palca widoczne (korona 1). Bez gryfu: czytanie z pięciolinii (korona 2). */
export type SongMode = 'fretboard' | 'staff'

/** Co gramy: jedną frazę (numer) albo całą piosenkę. */
export type SongScope = number | 'song'

/** Nutki za podejście: fraza – na rozgrzewkę, cała piosenka – więcej. Nowa korona: osobno (+5). */
export const PHRASE_XP = 1
export const SONG_XP = 3
export const CROWN_XP = 5

/** Korona 2: bez gryfu i co najmniej 90% nut za pierwszym razem. */
export const CROWN_2_PERCENT = 90

export type Crown = 0 | 1 | 2 | 3

export interface SongRun {
  songId: string
  mode: SongMode
  scope: SongScope
  notes: readonly SongNote[]
  /** Pierwsza nuta każdej frazy w `notes` (przy całej piosence – kilka, przy frazie – [0]). */
  phraseStarts: readonly number[]
  /** Numer pierwszej frazy (przy całej piosence 0). */
  firstPhrase: number
  /** Indeks bieżącej nuty; równy długości = koniec. */
  index: number
  /** Dla każdej zagranej już nuty: czy za pierwszym razem. */
  results: readonly boolean[]
  /** Czy przy bieżącej nucie była pomyłka albo podpowiedź. */
  missed: boolean
}

export function newSongRun(song: Song, mode: SongMode, scope: SongScope): SongRun {
  const phrases = scope === 'song' ? song.phrases : [song.phrases[scope]]
  if (phrases[0] === undefined) throw new Error(`Piosenka „${song.id}” nie ma frazy ${scope}`)
  const phraseStarts: number[] = []
  const notes: SongNote[] = []
  for (const p of phrases) {
    phraseStarts.push(notes.length)
    notes.push(...phraseNotes(p))
  }
  return {
    songId: song.id,
    mode,
    scope,
    notes,
    phraseStarts,
    firstPhrase: scope === 'song' ? 0 : scope,
    index: 0,
    results: [],
    missed: false,
  }
}

export const isRunFinished = (r: SongRun) => r.index >= r.notes.length
export const runNote = (r: SongRun): SongNote | null => r.notes[r.index] ?? null

/** Gdzie jesteśmy: numer frazy w piosence i nuty w tej frazie – do podświetlenia na pięciolinii. */
export function runPosition(r: SongRun): { phrase: number; note: number } {
  const i = Math.min(r.index, r.notes.length - 1)
  let p = 0
  while (p + 1 < r.phraseStarts.length && r.phraseStarts[p + 1] <= i) p++
  return { phrase: r.firstPhrase + p, note: r.index - r.phraseStarts[p] }
}

/** Trafiona bieżąca nuta – od razu następna (bez pauzy na „brawo”: melodia ma płynąć). */
export function runHit(r: SongRun): SongRun {
  if (isRunFinished(r)) return r
  return { ...r, index: r.index + 1, results: [...r.results, !r.missed], missed: false }
}

/** Inna nuta – bez kary, tylko ta nuta nie liczy się „za pierwszym razem”. */
export function runMiss(r: SongRun): SongRun {
  return isRunFinished(r) ? r : { ...r, missed: true }
}

/** Podpowiedź (gryf w trybie „bez gryfu”) – liczy się jak pomyłka przy tej nucie. */
export const runHint = runMiss

export const firstTryCount = (r: SongRun) => r.results.filter(Boolean).length

/**
 * Korona, na którą zasługuje skończone podejście. Tylko cała piosenka daje koronę:
 * 1 – zagrana do końca (w dowolnym trybie), 2 – bez gryfu i ≥ 90% za pierwszym razem.
 * Korona 3 (rytm) to osobny krok.
 */
export function runCrown(r: SongRun): Crown {
  if (!isRunFinished(r) || r.scope !== 'song') return 0
  // Procenty w liczbach całkowitych – bez błędów zaokrągleń (27 z 30 to dokładnie 90%).
  const good = firstTryCount(r) * 100 >= r.notes.length * CROWN_2_PERCENT
  return r.mode === 'staff' && good ? 2 : 1
}

/** Nutki za skończone podejście (bez premii za nową koronę – ta zależy od historii). */
export function runXp(r: SongRun): number {
  if (!isRunFinished(r)) return 0
  return r.scope === 'song' ? SONG_XP : PHRASE_XP
}
