// Nuty I pozycji: każda struna od pustej do 3. progu, palec = numer progu.
// Półtony zapisujemy krzyżykami (jak w podręcznikach dla początkujących), nie bemolami.
import { STANDARD_TUNING } from '../audio/pitch/notes'

/**
 * Nazwy według klasy wysokości (0 = C): zapis z ♯ i polska nazwa czytana („fis”).
 * Uwaga: po polsku B to B♭ – dlatego A♯ zostaje „ais”, a nuta 11 to H.
 */
const NAMES: readonly { name: string; spoken: string }[] = [
  { name: 'C', spoken: 'c' },
  { name: 'C♯', spoken: 'cis' },
  { name: 'D', spoken: 'd' },
  { name: 'D♯', spoken: 'dis' },
  { name: 'E', spoken: 'e' },
  { name: 'F', spoken: 'f' },
  { name: 'F♯', spoken: 'fis' },
  { name: 'G', spoken: 'g' },
  { name: 'G♯', spoken: 'gis' },
  { name: 'A', spoken: 'a' },
  { name: 'A♯', spoken: 'ais' },
  { name: 'H', spoken: 'h' },
]

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
  /** Nazwa do wyświetlenia, np. „H”, „F♯”. */
  name: string
  /** Polska nazwa czytana, np. „h”, „fis”. */
  spoken: string
  sharp: boolean
  /** Oktawa brzmienia w notacji naukowej (E2 = najgrubsza pusta struna). */
  octave: number
}

export function noteName(midi: number): { name: string; spoken: string; sharp: boolean } {
  const n = NAMES[((midi % 12) + 12) % 12]
  return { ...n, sharp: n.name.endsWith('♯') }
}

/** Wszystkie nuty I pozycji (24: 17 naturalnych + 7 z krzyżykiem), od najniższej do najwyższej. */
export const FIRST_POSITION: readonly FretNote[] = [...STANDARD_TUNING]
  .flatMap((s) =>
    Array.from({ length: FIRST_POSITION_FRETS + 1 }, (_, fret) => {
      const midi = s.midi + fret
      return { string: s.number, fret, finger: fret, midi, ...noteName(midi), octave: Math.floor(midi / 12) - 1 }
    }),
  )
  .sort((a, b) => a.midi - b.midi)

/** Tylko nuty naturalne – np. do łatwiejszego poziomu gry. */
export const FIRST_POSITION_NATURALS = FIRST_POSITION.filter((n) => !n.sharp)
