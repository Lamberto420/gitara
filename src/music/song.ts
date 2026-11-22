// Zapis piosenki: nuty z długościami, takty i frazy – z krótkiego tekstu w kodzie.
// Czyste funkcje: parser wyłapuje błędy zapisu (nuta spoza I pozycji, niepełny takt,
// tekst nie pasujący do nut) już w testach, zanim piosenka trafi do dziecka.
import { FIRST_POSITION, type FretNote } from './firstPosition'
import { GUITAR_OCTAVE_SHIFT } from './staff'

/** Wartość rytmiczna: 1 = cała nuta, 2 = półnuta, 4 = ćwierćnuta, 8 = ósemka, 16 = szesnastka. */
export type NoteValue = 1 | 2 | 4 | 8 | 16

export interface SongNote {
  kind: 'note'
  /** Miejsce na gryfie w I pozycji (wysokość brzmienia, struna, próg, palec). */
  note: FretNote
  value: NoteValue
  dotted: boolean
  /** Sylaba tekstu pod nutą (z myślnikiem, gdy słowo trwa dalej); brak = bez tekstu. */
  syllable?: string
}

export interface SongRest {
  kind: 'rest'
  value: NoteValue
  dotted: boolean
}

/** Kreska taktowa – potrzebna tylko do rysowania. */
export interface SongBar {
  kind: 'bar'
}

export type SongItem = SongNote | SongRest | SongBar

export interface Phrase {
  items: readonly SongItem[]
}

/** Piosenka w postaci do zapisania w kodzie (patrz `parseSong`). */
export interface SongSource {
  /** Stałe id – zapisują się z nim zdarzenia i korony, więc nigdy go nie zmieniamy. */
  id: string
  title: string
  /** Skąd pewność, że to domena publiczna (ADR 0001), np. „niemiecka piosenka ludowa”. */
  origin: string
  /** Metrum, np. [3, 4] albo [6, 8]. */
  meter: readonly [number, number]
  /** Tempo w ćwierćnutach na minutę (też w metrum 6/8). */
  bpm: number
  /**
   * Frazy. Nuta to wysokość ZAPISU (tak jak na pięciolinii, oktawę wyżej niż brzmi):
   * litera C D E F G A H, opcjonalnie „#”, oktawa, np. „F#5”; „R” = pauza.
   * Długość po ukośniku: „/2” półnuta, „/8.” ósemka z kropką; bez ukośnika = ćwierćnuta.
   * „|” = kreska taktowa. Takty mogą przechodzić z frazy do frazy (przedtakt kolejnej frazy).
   * Tekst: sylaby oddzielone spacją lub myślnikiem („Pa-nie Ja-nie”), „_” = nuta bez nowej
   * sylaby (śpiewana dalej poprzednia); liczba sylab = liczba nut frazy.
   */
  phrases: readonly { notes: string; lyrics?: string }[]
}

export interface Song extends Omit<SongSource, 'phrases'> {
  phrases: readonly Phrase[]
}

/** Po polsku B to B♭ – dlatego naturalne „si” zapisujemy jako H, a litery B nie przyjmujemy. */
const STEPS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, H: 11 }
const TOKEN = /^(?:([A-Z])(#?)(\d)|R)(?:\/(1|2|4|8|16)(\.?))?$/

export const SIXTEENTHS_PER_WHOLE = 16

/** Długość w szesnastkach (kropka przedłuża o połowę). */
export function sixteenths(value: NoteValue, dotted: boolean): number {
  const base = SIXTEENTHS_PER_WHOLE / value
  return dotted ? base * 1.5 : base
}

/** Długość taktu w szesnastkach, np. 3/4 → 12, 6/8 → 12. */
export function barSixteenths([beats, unit]: readonly [number, number]): number {
  return (beats * SIXTEENTHS_PER_WHOLE) / unit
}

const BY_MIDI = new Map(FIRST_POSITION.map((n) => [n.midi, n]))

/** Jeden element zapisu, np. „F#5/8.”. Rzuca błąd z opisem dla piszącego piosenkę. */
export function parseToken(token: string): SongNote | SongRest {
  const m = TOKEN.exec(token)
  if (!m) throw new Error(`Nie rozumiem zapisu „${token}”`)
  const [, letter, sharp, octave, valueText, dot] = m
  const value = Number(valueText ?? 4) as NoteValue
  const dotted = dot === '.'
  if (dotted && value === 16) throw new Error(`Szesnastka z kropką nie jest obsługiwana: „${token}”`)
  if (!letter) return { kind: 'rest', value, dotted }

  if (!(letter in STEPS)) {
    throw new Error(letter === 'B' ? `„${token}”: po polsku B to B♭ – naturalne si zapisz jako H` : `Nieznana nuta „${token}”`)
  }
  const written = (Number(octave) + 1) * 12 + STEPS[letter] + (sharp ? 1 : 0)
  const note = BY_MIDI.get(written - GUITAR_OCTAVE_SHIFT)
  if (!note) throw new Error(`Nuta „${token}” jest poza I pozycją`)
  return { kind: 'note', note, value, dotted }
}

/** Sylaby: „Pa-nie Ja-nie” → [„Pa-”, „nie”, „Ja-”, „nie”]; „_” → nuta bez nowej sylaby. */
export function splitLyrics(lyrics: string): (string | undefined)[] {
  return lyrics
    .trim()
    .split(/\s+/)
    .flatMap((word) => word.split(/(?<=-)/))
    .map((s) => (s === '_' ? undefined : s))
}

/** Piosenka z zapisu tekstowego; sprawdza takty i dopasowanie tekstu. */
export function parseSong(source: SongSource): Song {
  const fail = (message: string): never => {
    throw new Error(`Piosenka „${source.id}”: ${message}`)
  }
  const full = barSixteenths(source.meter)
  /** Długości kolejnych taktów (przez wszystkie frazy). */
  const bars: number[] = [0]

  const phrases = source.phrases.map(({ notes, lyrics }, p) => {
    const items: SongItem[] = []
    for (const token of notes.trim().split(/\s+/)) {
      if (token === '|') {
        items.push({ kind: 'bar' })
        bars.push(0)
        continue
      }
      let item: SongNote | SongRest
      try {
        item = parseToken(token)
      } catch (e) {
        return fail(`fraza ${p + 1}: ${(e as Error).message}`)
      }
      items.push(item)
      bars[bars.length - 1] += sixteenths(item.value, item.dotted)
    }

    const notesOnly = items.filter((i): i is SongNote => i.kind === 'note')
    if (notesOnly.length === 0) fail(`fraza ${p + 1} nie ma żadnej nuty`)
    if (lyrics !== undefined) {
      const syllables = splitLyrics(lyrics)
      if (syllables.length !== notesOnly.length) {
        fail(`fraza ${p + 1}: ${syllables.length} sylab na ${notesOnly.length} nut`)
      }
      notesOnly.forEach((n, i) => {
        if (syllables[i] !== undefined) n.syllable = syllables[i]
      })
    }
    return { items }
  })

  // Pierwszy takt może być przedtaktem, ostatni – niepełny; środkowe muszą być pełne.
  bars.forEach((length, i) => {
    const edge = i === 0 || i === bars.length - 1
    if (length > full || (!edge && length !== full) || length === 0) {
      fail(`takt ${i + 1} ma ${length}/16 zamiast ${full}/16`)
    }
  })

  return { ...source, phrases }
}

/** Nuty frazy po kolei (bez pauz i kresek) – to je sprawdza mikrofon. */
export function phraseNotes(phrase: Phrase): SongNote[] {
  return phrase.items.filter((i): i is SongNote => i.kind === 'note')
}

/** Wszystkie nuty piosenki po kolei. */
export function songNotes(song: Song): SongNote[] {
  return song.phrases.flatMap(phraseNotes)
}
