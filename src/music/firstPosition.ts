// Nuty I pozycji: każda struna od pustej do 3. progu, palec = numer progu.
// Na razie tylko nuty naturalne (bez krzyżyków) – tyle zna uczeń; krzyżyki dojdą przez NATURAL_NAMES.
import { STANDARD_TUNING } from '../audio/pitch/notes'

/** Polskie nazwy nut naturalnych według klasy wysokości (0 = C). B nazywamy H. */
const NATURAL_NAMES: Partial<Record<number, string>> = { 0: 'C', 2: 'D', 4: 'E', 5: 'F', 7: 'G', 9: 'A', 11: 'H' }

export const FIRST_POSITION_FRETS = 3

export interface FretNote {
  /** Numer struny: 1 = najcieńsza (E4), 6 = najgrubsza (E2). */
  string: number
  /** 0 = pusta struna. */
  fret: number
  /** Palec lewej ręki: 0 = pusta struna, 1 = wskazujący … 4 = mały. W I pozycji palec = próg. */
  finger: number
  /** Wysokość BRZMIENIA (MIDI). Zapis nutowy gitary jest o oktawę wyżej. */
  midi: number
  /** Polska nazwa, np. „H”. */
  name: string
  /** Oktawa brzmienia w notacji naukowej (E2 = najgrubsza pusta struna). */
  octave: number
}

/** Nazwa nuty naturalnej albo null dla dźwięku z krzyżykiem/bemolem. */
export function naturalName(midi: number): string | null {
  return NATURAL_NAMES[((midi % 12) + 12) % 12] ?? null
}

/** Wszystkie nuty naturalne I pozycji, od najniższej do najwyższej. */
export const FIRST_POSITION: readonly FretNote[] = [...STANDARD_TUNING]
  .flatMap((s) =>
    Array.from({ length: FIRST_POSITION_FRETS + 1 }, (_, fret) => {
      const midi = s.midi + fret
      const name = naturalName(midi)
      return name ? { string: s.number, fret, finger: fret, midi, name, octave: Math.floor(midi / 12) - 1 } : null
    }),
  )
  .filter((n): n is FretNote => n !== null)
  .sort((a, b) => a.midi - b.midi)
