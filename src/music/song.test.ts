import { describe, expect, it } from 'vitest'
import { barSixteenths, parseSong, parseToken, phraseNotes, sixteenths, songNotes, splitLyrics, type SongSource } from './song'
import { SONGS } from './songs'
import { FIRST_POSITION } from './firstPosition'

const song = (phrases: SongSource['phrases'], meter: [number, number] = [4, 4]): SongSource => ({
  id: 'test',
  title: 'Test',
  origin: 'test',
  meter,
  bpm: 100,
  phrases,
})

describe('parseToken', () => {
  it('wysokość ZAPISU → nuta I pozycji o oktawę niżej (brzmienie)', () => {
    const n = parseToken('E5')
    expect(n).toMatchObject({ kind: 'note', value: 4, dotted: false })
    if (n.kind !== 'note') throw new Error()
    // Zapisane E5 to pusta struna 1 (brzmi E4).
    expect(n.note).toMatchObject({ string: 1, fret: 0, midi: 64 })
  })

  it('krzyżyk, długość i kropka', () => {
    const n = parseToken('F#5/8.')
    expect(n).toMatchObject({ kind: 'note', value: 8, dotted: true, note: { string: 1, fret: 2, name: 'F♯' } })
    expect(parseToken('C4/1')).toMatchObject({ value: 1, note: { string: 5, fret: 3 } })
  })

  it('pauza', () => {
    expect(parseToken('R/2')).toEqual({ kind: 'rest', value: 2, dotted: false })
  })

  it('H to naturalne si, a B odrzucamy z wyjaśnieniem (po polsku B = B♭)', () => {
    expect(parseToken('H4')).toMatchObject({ note: { string: 2, fret: 0, name: 'H' } })
    expect(() => parseToken('B4')).toThrow(/B♭/)
  })

  it('odrzuca nuty spoza I pozycji i błędny zapis', () => {
    expect(() => parseToken('A5')).toThrow(/poza I pozycją/)
    expect(() => parseToken('D3')).toThrow(/poza I pozycją/)
    expect(() => parseToken('E5/3')).toThrow(/Nie rozumiem/)
    expect(() => parseToken('E5/16.')).toThrow(/kropką/)
  })
})

describe('długości', () => {
  it('szesnastki i takty', () => {
    expect(sixteenths(4, false)).toBe(4)
    expect(sixteenths(4, true)).toBe(6)
    expect(sixteenths(2, true)).toBe(12)
    expect(barSixteenths([4, 4])).toBe(16)
    expect(barSixteenths([3, 4])).toBe(12)
    expect(barSixteenths([6, 8])).toBe(12)
  })
})

describe('splitLyrics', () => {
  it('dzieli na sylaby, zostawia myślnik przy sylabie, „_” = bez nowej sylaby', () => {
    expect(splitLyrics(' Pa-nie Ja-nie, _ bim ')).toEqual(['Pa-', 'nie', 'Ja-', 'nie,', undefined, 'bim'])
  })
})

describe('parseSong', () => {
  it('frazy z nutami, pauzami i kreskami; sylaby przypisane do nut', () => {
    const s = parseSong(song([{ notes: 'E5 R E5/2 |', lyrics: 'Ty-lko' }, { notes: 'C5/1' }]))
    expect(s.phrases[0].items.map((i) => i.kind)).toEqual(['note', 'rest', 'note', 'bar'])
    expect(phraseNotes(s.phrases[0]).map((n) => n.syllable)).toEqual(['Ty-', 'lko'])
    expect(songNotes(s)).toHaveLength(3)
  })

  it('takt może przechodzić z frazy do frazy (przedtakt)', () => {
    expect(() => parseSong(song([{ notes: 'E5/8. E5/16 | E5 E5 E5 | E5/2' }, { notes: 'E5 | E5/2.' }], [3, 4]))).not.toThrow()
  })

  it('środkowy takt musi być pełny', () => {
    expect(() => parseSong(song([{ notes: 'E5/1 | E5 E5 E5 | E5/1' }]))).toThrow(/takt 2 ma 12\/16 zamiast 16\/16/)
    expect(() => parseSong(song([{ notes: 'E5/1 E5 | E5/1' }]))).toThrow(/takt 1 ma 20\/16/)
  })

  it('pusty takt (np. „|” na końcu piosenki) to błąd', () => {
    expect(() => parseSong(song([{ notes: 'E5/1 |' }]))).toThrow(/takt 2 ma 0\/16/)
  })

  it('liczba sylab musi się zgadzać z liczbą nut', () => {
    expect(() => parseSong(song([{ notes: 'E5 E5 E5/2', lyrics: 'raz dwa' }]))).toThrow(/2 sylab na 3 nut/)
  })

  it('fraza bez nut i błąd zapisu z numerem frazy', () => {
    expect(() => parseSong(song([{ notes: 'R/1' }]))).toThrow(/fraza 1 nie ma żadnej nuty/)
    expect(() => parseSong(song([{ notes: 'E5/1 |' }, { notes: 'B4/1' }]))).toThrow(/test.*fraza 2/)
  })
})

describe('SONGS', () => {
  it('co najmniej 8 piosenek, stałe i unikalne id', () => {
    expect(SONGS.length).toBeGreaterThanOrEqual(8)
    expect(new Set(SONGS.map((s) => s.id)).size).toBe(SONGS.length)
    expect(SONGS[0].id).toBe('mary-lamb')
  })

  it('każda piosenka ma pochodzenie z domeny publicznej i co najmniej dwie frazy', () => {
    for (const s of SONGS) {
      expect(s.origin.length, s.id).toBeGreaterThan(5)
      expect(s.phrases.length, s.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('każda nuta jest w I pozycji', () => {
    for (const n of SONGS.flatMap(songNotes)) expect(FIRST_POSITION).toContain(n.note)
  })
})
