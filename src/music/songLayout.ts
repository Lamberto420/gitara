// Rozkład frazy na pięciolinii: gdzie stoi każda nuta, w którą stronę laska, które ósemki
// łączymy belką i gdzie zawinąć linię. Czysta logika – komponent tylko rysuje wynik.
import type { FretNote } from './firstPosition'
import { barSixteenths, sixteenths, type NoteValue, type Song, type SongNote, type SongRest } from './song'
import { guitarStaffPosition, hasSharp, ledgerLines, stemUp } from './staff'

/** Miejsce na klucz na początku każdej linii. */
export const CLEF_SPACE = 44
/** Miejsce na metrum (tylko pierwsza linia frazy). */
export const METER_SPACE = 20
export const SHARP_SPACE = 14
const RIGHT_PAD = 8
const BAR_SPACE = 12
/** Środkowa linia pięciolinii – od niej liczymy kierunek lasek. */
const MIDDLE = 4

/** Szersze miejsce dla dłuższych nut, ale nie proporcjonalnie – cała nuta byłaby za szeroka. */
export const advance = (length: number) => 14 + 8 * Math.sqrt(length)

/** Przybliżona szerokość sylaby (czcionka 12) – sylaby pod ósemkami nie mogą na siebie wchodzić. */
export const syllableWidth = (syllable: string | undefined) => (syllable ? syllable.length * 6.6 + 6 : 0)

/** Miejsce zajmowane przez nutę lub pauzę: rytm, a przy tekście – co najmniej szerokość sylaby. */
function itemAdvance(item: SongNote | SongRest): number {
  const rhythm = advance(sixteenths(item.value, item.dotted))
  return item.kind === 'note' ? Math.max(rhythm, syllableWidth(item.syllable)) : rhythm
}

export interface LaidNote {
  kind: 'note'
  x: number
  /** Pozycja na pięciolinii (0 = dolna linia, co pół odstępu). */
  position: number
  note: FretNote
  value: NoteValue
  dotted: boolean
  /** Główka wypełniona (ćwierćnuta i krótsze). */
  filled: boolean
  /** Laska: brak przy całej nucie. */
  stem: 'up' | 'down' | null
  /** Chorągiewki – tylko gdy nuta nie jest w belce. */
  flags: number
  sharp: boolean
  ledgers: number[]
  syllable?: string
  /** Numer nuty we frazie (bez pauz) – do podświetlania bieżącej. */
  index: number
}

export interface LaidRest {
  kind: 'rest'
  x: number
  value: NoteValue
  dotted: boolean
}

export interface LaidBar {
  kind: 'bar'
  x: number
}

export type LaidItem = LaidNote | LaidRest | LaidBar

/** Belka nad (pod) grupą ósemek/szesnastek w jednej mierze. */
export interface Beam {
  /** Numery nut (`index`) w grupie, po kolei. */
  notes: number[]
  up: boolean
  /** Odcinki drugiej belki (szesnastki): od–do numeru nuty; ten sam numer = krótki „ogonek”. */
  secondary: [number, number][]
}

export interface StaffLine {
  items: LaidItem[]
  beams: Beam[]
  width: number
  /** Pierwsza linia frazy – z metrum. */
  meter: boolean
}

/** Przesunięcie (w szesnastkach od początku taktu), od którego zaczyna się każda fraza. */
export function phraseOffsets(song: Song): number[] {
  const full = barSixteenths(song.meter)
  const firstBar = song.phrases[0].items.findIndex((i) => i.kind === 'bar')
  // Pierwszy takt krótszy od pełnego to przedtakt – kończy się razem z taktem, więc zaczyna później.
  const pickup = song.phrases[0].items
    .slice(0, firstBar === -1 ? undefined : firstBar)
    .reduce((sum, i) => sum + (i.kind === 'bar' ? 0 : sixteenths(i.value, i.dotted)), 0)
  let offset = firstBar !== -1 && pickup < full ? full - pickup : 0
  return song.phrases.map((phrase) => {
    const start = offset
    for (const i of phrase.items) offset = i.kind === 'bar' ? 0 : offset + sixteenths(i.value, i.dotted)
    return start
  })
}

/** Długość „miary” do łączenia belką: ćwierćnuta, a w 6/8 – ćwierćnuta z kropką. */
function beatLength([beats, unit]: readonly [number, number]): number {
  return unit === 8 && beats % 3 === 0 ? 6 : 4
}

/** Kierunek lasek grupy: decyduje nuta najdalej od środkowej linii (jak w podręcznikach). */
function groupUp(positions: number[]): boolean {
  const far = positions.reduce((a, b) => (Math.abs(b - MIDDLE) > Math.abs(a - MIDDLE) ? b : a))
  return stemUp(far)
}

/**
 * Rozkład frazy na linie nie szersze niż `maxWidth` (zawijamy tylko na kreskach taktowych).
 */
export function layoutPhrase(song: Song, phraseIndex: number, maxWidth: number): StaffLine[] {
  const phrase = song.phrases[phraseIndex]
  const beat = beatLength(song.meter)

  // 1. Nuty z miejscem w takcie i grupy belek (ósemki i szesnastki w tej samej mierze).
  type Entry = { item: (typeof phrase.items)[number]; offset: number; index: number }
  const entries: Entry[] = []
  let offset = phraseOffsets(song)[phraseIndex]
  let index = 0
  for (const item of phrase.items) {
    entries.push({ item, offset, index: item.kind === 'note' ? index++ : -1 })
    offset = item.kind === 'bar' ? 0 : offset + sixteenths(item.value, item.dotted)
  }

  const groups: number[][] = []
  let run: Entry[] = []
  const closeRun = () => {
    if (run.length >= 2) groups.push(run.map((e) => e.index))
    run = []
  }
  for (const e of entries) {
    const short = e.item.kind === 'note' && e.item.value >= 8
    if (!short) {
      closeRun()
      continue
    }
    if (run.length && Math.floor(run[0].offset / beat) !== Math.floor(e.offset / beat)) closeRun()
    run.push(e)
  }
  closeRun()
  const groupOf = new Map<number, number>()
  groups.forEach((g, gi) => g.forEach((n) => groupOf.set(n, gi)))

  const positionOf = (n: number) => {
    const e = entries.find((x) => x.index === n)!
    return guitarStaffPosition((e.item as { note: FretNote }).note.midi)
  }
  const beams: Beam[] = groups.map((g) => {
    const values = g.map((n) => (entries.find((x) => x.index === n)!.item as { value: NoteValue }).value)
    const secondary: [number, number][] = []
    for (let i = 0; i < g.length; i++) {
      if (values[i] !== 16) continue
      let j = i
      while (j + 1 < g.length && values[j + 1] === 16) j++
      // Pojedyncza szesnastka: ogonek w stronę sąsiada (na końcu grupy – do poprzedniej nuty).
      secondary.push([g[i], g[j]])
      i = j
    }
    return { notes: g, up: groupUp(g.map(positionOf)), secondary }
  })

  // 2. Segmenty od kreski do kreski i zawijanie linii.
  const segments: Entry[][] = [[]]
  for (const e of entries) {
    segments[segments.length - 1].push(e)
    if (e.item.kind === 'bar') segments.push([])
  }
  if (segments[segments.length - 1].length === 0) segments.pop()

  const segmentWidth = (seg: Entry[]) =>
    seg.reduce(
      (w, e) =>
        w +
        (e.item.kind === 'bar'
          ? BAR_SPACE
          : itemAdvance(e.item) + (e.item.kind === 'note' && e.item.note.sharp ? SHARP_SPACE : 0)),
      0,
    )

  const widths = segments.map(segmentWidth)
  const start = (first: boolean) => CLEF_SPACE + (first ? METER_SPACE : 0)
  /** Zachłanne pakowanie segmentów w linie nie szersze niż `limit`. */
  const pack = (limit: number): Entry[][] => {
    const result: Entry[][] = []
    let current: Entry[] = []
    let width = 0
    segments.forEach((seg, i) => {
      if (current.length && start(result.length === 0) + width + widths[i] + RIGHT_PAD > limit) {
        result.push(current)
        current = []
        width = 0
      }
      current.push(...seg)
      width += widths[i]
    })
    if (current.length) result.push(current)
    return result
  }
  // Tyle linii, ile trzeba przy pełnej szerokości – ale wyrównanych: lepiej 2 + 2 takty niż 3 + 1.
  const needed = pack(maxWidth)
  let packed = needed
  if (needed.length > 1) {
    const total = widths.reduce((a, b) => a + b, 0)
    for (let limit = Math.ceil(total / needed.length); limit < maxWidth; limit += 4) {
      const attempt = pack(Math.min(maxWidth, limit + start(false) + RIGHT_PAD))
      if (attempt.length === needed.length) {
        packed = attempt
        break
      }
    }
  }
  return packed.map((line, i) => place(line, i === 0))

  function place(line: Entry[], first: boolean): StaffLine {
    let x = start(first)
    const items: LaidItem[] = line.map(({ item, index: n }) => {
      if (item.kind === 'bar') {
        const bar: LaidBar = { kind: 'bar', x: x + BAR_SPACE / 2 }
        x += BAR_SPACE
        return bar
      }
      if (item.kind === 'rest') {
        const rest: LaidRest = { kind: 'rest', x: x + 10, value: item.value, dotted: item.dotted }
        x += itemAdvance(item)
        return rest
      }
      const sharp = hasSharp(item.note.midi)
      if (sharp) x += SHARP_SPACE
      // Sylaba szersza niż nuta: nuta stoi na środku swojego miejsca, pod nią sylaba.
      const center = Math.max(10, syllableWidth(item.syllable) / 2)
      const position = guitarStaffPosition(item.note.midi)
      const group = groupOf.get(n)
      const note: LaidNote = {
        kind: 'note',
        x: x + center,
        position,
        note: item.note,
        value: item.value,
        dotted: item.dotted,
        filled: item.value >= 4,
        stem: item.value === 1 ? null : (group === undefined ? stemUp(position) : beams[group].up) ? 'up' : 'down',
        flags: group === undefined ? Math.max(0, Math.log2(item.value) - 2) : 0,
        sharp,
        ledgers: ledgerLines(position),
        index: n,
        ...(item.syllable !== undefined && { syllable: item.syllable }),
      }
      x += itemAdvance(item)
      return note
    })
    const indexes = new Set(items.flatMap((i) => (i.kind === 'note' ? [i.index] : [])))
    return {
      items,
      beams: beams.filter((b) => indexes.has(b.notes[0])),
      width: x + RIGHT_PAD,
      meter: first,
    }
  }
}
