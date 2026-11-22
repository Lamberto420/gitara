import { describe, expect, it } from 'vitest'
import { parseSong, type SongSource } from './song'
import { SONGS } from './songs'
import { layoutPhrase, phraseOffsets, syllableWidth, type LaidNote, type StaffLine } from './songLayout'

const byId = (id: string) => SONGS.find((s) => s.id === id)!
const notes = (lines: StaffLine[]) => lines.flatMap((l) => l.items).filter((i): i is LaidNote => i.kind === 'note')
const WIDE = 10_000

const make = (notes: string, meter: [number, number] = [4, 4]) =>
  parseSong({ id: 't', title: 't', origin: 't', meter, bpm: 100, phrases: [{ notes }] } satisfies SongSource)

describe('phraseOffsets', () => {
  it('bez przedtaktu frazy zaczynają się od początku taktu', () => {
    expect(phraseOffsets(byId('mary-lamb'))).toEqual([0, 0, 0, 0])
  })

  it('przedtakt („Hap-py”) zaczyna się pod koniec taktu – każda fraza w 3/4 od 8/16', () => {
    expect(phraseOffsets(byId('happy-birthday'))).toEqual([8, 8, 8, 8])
  })
})

describe('layoutPhrase', () => {
  it('ćwierćnuty i półnuty: główki, laski w dół od środkowej linii, bez belek', () => {
    const [line] = layoutPhrase(byId('mary-lamb'), 0, WIDE)
    const ns = notes([line])
    expect(ns).toHaveLength(7)
    expect(line.beams).toEqual([])
    expect(ns.map((n) => n.filled)).toEqual([true, true, true, true, true, true, false])
    // E5 w zapisie = pozycja 7 (nad środkową linią) → laska w dół.
    expect(ns[0]).toMatchObject({ position: 7, stem: 'down', flags: 0 })
    expect(line.items.filter((i) => i.kind === 'bar')).toHaveLength(2)
  })

  it('cała nuta bez laski, nuty pod środkową linią z laską w górę', () => {
    const ns = notes(layoutPhrase(byId('alle-meine-entchen'), 4, WIDE))
    expect(ns[0]).toMatchObject({ stem: 'up' }) // D4 pod pięciolinią
    expect(ns[4]).toMatchObject({ value: 1, stem: null, filled: false })
  })

  it('ósemki łączymy belką w obrębie ćwierćnuty, z jednym kierunkiem lasek', () => {
    const [line] = layoutPhrase(byId('panie-janie'), 2, WIDE)
    expect(line.beams.map((b) => b.notes)).toEqual([[0, 1], [2, 3], [6, 7], [8, 9]])
    expect(line.beams.every((b) => !b.up)).toBe(true)
    expect(notes([line]).filter((n) => n.value === 8).every((n) => n.flags === 0 && n.stem === 'down')).toBe(true)
  })

  it('pojedyncza ósemka dostaje chorągiewkę', () => {
    const ns = notes(layoutPhrase(byId('silent-night'), 0, WIDE))
    expect(ns[1]).toMatchObject({ value: 8, flags: 1 })
  })

  it('w 6/8 belka obejmuje trzy ósemki (miara = ćwierćnuta z kropką)', () => {
    const [line] = layoutPhrase(make('E5/8 E5/8 E5/8 E5/8 E5/8 E5/8', [6, 8]), 0, WIDE)
    expect(line.beams.map((b) => b.notes)).toEqual([[0, 1, 2], [3, 4, 5]])
  })

  it('ósemka z kropką i szesnastka: belka + krótki ogonek drugiej belki', () => {
    const [line] = layoutPhrase(byId('happy-birthday'), 0, WIDE)
    expect(line.beams).toEqual([{ notes: [0, 1], up: true, secondary: [[1, 1]] }])
  })

  it('pauza przerywa belkę', () => {
    const [line] = layoutPhrase(make('E5/8 R/8 E5/8 E5/8 E5/2'), 0, WIDE)
    expect(line.beams.map((b) => b.notes)).toEqual([[1, 2]])
    expect(notes([line])[0].flags).toBe(1)
  })

  it('krzyżyk zabiera miejsce przed nutą', () => {
    const [plain] = layoutPhrase(make('E5 E5 E5/2'), 0, WIDE)
    const [sharp] = layoutPhrase(make('E5 F#5 E5/2'), 0, WIDE)
    expect(notes([sharp])[1].sharp).toBe(true)
    expect(notes([sharp])[1].x - notes([sharp])[0].x).toBeGreaterThan(notes([plain])[1].x - notes([plain])[0].x)
  })

  it('dłuższa nuta zajmuje więcej miejsca', () => {
    const ns = notes(layoutPhrase(byId('mary-lamb'), 0, WIDE))
    expect(ns[6].x - ns[5].x).toBeLessThan(ns[1].x - ns[0].x + 20)
    const [line] = layoutPhrase(make('E5/2 E5/2 | E5 E5 E5 E5'), 0, WIDE)
    const xs = notes([line]).map((n) => n.x)
    expect(xs[1] - xs[0]).toBeGreaterThan(xs[3] - xs[2])
  })

  it('sylaby trafiają do nut', () => {
    expect(notes(layoutPhrase(byId('panie-janie'), 0, WIDE)).map((n) => n.syllable)).toEqual([
      'Pa-', 'nie', 'Ja-', 'nie,', 'pa-', 'nie', 'Ja-', 'nie,',
    ])
  })

  it('sylaby pod ósemkami nie nachodzą na siebie', () => {
    const ns = notes(layoutPhrase(byId('panie-janie'), 2, WIDE))
    for (let i = 1; i < ns.length; i++) {
      const gap = ns[i].x - ns[i - 1].x
      expect(gap, ns[i].syllable).toBeGreaterThanOrEqual((syllableWidth(ns[i].syllable) + syllableWidth(ns[i - 1].syllable)) / 2 - 1e-9)
    }
  })

  it('długa fraza zawija się tylko na kreskach taktowych i mieści w szerokości', () => {
    const lines = layoutPhrase(byId('jingle-bells'), 1, 300)
    expect(lines.length).toBeGreaterThanOrEqual(2)
    expect(lines.map((l) => l.meter)).toEqual(lines.map((_, i) => i === 0))
    for (const l of lines.slice(0, -1)) expect(l.items.at(-1)?.kind).toBe('bar')
    for (const l of lines) expect(l.width).toBeLessThanOrEqual(300)
    // Żadna nuta nie ginie ani się nie dubluje.
    expect(notes(lines).map((n) => n.index)).toEqual([...Array(15).keys()])
  })

  it('linie są wyrównane: 4 takty na dwie linie to 2 + 2, nie 3 + 1', () => {
    const lines = layoutPhrase(byId('silent-night'), 2, 360)
    expect(lines.map((l) => l.items.filter((i) => i.kind === 'bar').length)).toEqual([2, 2])
    for (const l of lines) expect(l.width).toBeLessThanOrEqual(360)
  })

  it('takt szerszy niż linia zostaje w całości (nie tniemy taktu)', () => {
    const lines = layoutPhrase(byId('jingle-bells'), 1, 50)
    expect(lines).toHaveLength(4)
  })

  it('wszystkie frazy wszystkich piosenek dają się rozłożyć', () => {
    for (const s of SONGS) s.phrases.forEach((_, i) => expect(layoutPhrase(s, i, 320).length).toBeGreaterThan(0))
  })
})
