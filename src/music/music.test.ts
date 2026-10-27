import { describe, expect, it } from 'vitest'
import { FIRST_POSITION, FIRST_POSITION_NATURALS, noteName } from './firstPosition'
import { guitarStaffPosition, hasSharp, ledgerLines, staffPosition, stemUp } from './staff'

const label = (n: (typeof FIRST_POSITION)[number]) => `${n.name}${n.octave}:${n.string}/${n.fret}`

describe('FIRST_POSITION', () => {
  it('24 nuty: każda struna od pustej do 3. progu, chromatycznie od E2 do G4', () => {
    expect(FIRST_POSITION.map(label)).toEqual([
      'E2:6/0', 'F2:6/1', 'F♯2:6/2', 'G2:6/3',
      'A2:5/0', 'A♯2:5/1', 'H2:5/2', 'C3:5/3',
      'D3:4/0', 'D♯3:4/1', 'E3:4/2', 'F3:4/3',
      'G3:3/0', 'G♯3:3/1', 'A3:3/2', 'A♯3:3/3',
      'H3:2/0', 'C4:2/1', 'C♯4:2/2', 'D4:2/3',
      'E4:1/0', 'F4:1/1', 'F♯4:1/2', 'G4:1/3',
    ])
  })

  it('17 nut naturalnych bez krzyżyków', () => {
    expect(FIRST_POSITION_NATURALS.map(label)).toEqual([
      'E2:6/0', 'F2:6/1', 'G2:6/3',
      'A2:5/0', 'H2:5/2', 'C3:5/3',
      'D3:4/0', 'E3:4/2', 'F3:4/3',
      'G3:3/0', 'A3:3/2',
      'H3:2/0', 'C4:2/1', 'D4:2/3',
      'E4:1/0', 'F4:1/1', 'G4:1/3',
    ])
  })

  it('palec = próg (I pozycja), pusta struna = 0', () => {
    for (const n of FIRST_POSITION) expect(n.finger).toBe(n.fret)
  })

  it('polskie nazwy: H, a krzyżyki czytane fis/cis/gis/dis/ais (A♯ to nie „B”!)', () => {
    expect(noteName(59)).toEqual({ name: 'H', spoken: 'h', sharp: false })
    expect(noteName(58)).toEqual({ name: 'A♯', spoken: 'ais', sharp: true })
    expect(noteName(66)).toEqual({ name: 'F♯', spoken: 'fis', sharp: true })
    expect([61, 63, 68].map((m) => noteName(m).spoken)).toEqual(['cis', 'dis', 'gis'])
  })
})

describe('pięciolinia', () => {
  it('klucz wiolinowy: E4 na dolnej linii, F5 na górnej, C4 na pierwszej linii dodanej', () => {
    expect(staffPosition(64)).toBe(0)
    expect(staffPosition(77)).toBe(8)
    expect(staffPosition(60)).toBe(-2)
    expect(staffPosition(71)).toBe(4) // H4 na środkowej linii
  })

  it('gitara: zapis oktawę wyżej niż brzmienie', () => {
    expect(guitarStaffPosition(64)).toBe(7) // pusta 1. struna (E4) → zapis E5, czwarte pole
    expect(guitarStaffPosition(40)).toBe(-7) // pusta 6. struna (E2) → zapis E3, pod 3 liniami dodanymi
    expect(guitarStaffPosition(59)).toBe(4) // pusta struna H → środkowa linia
  })

  it('linie dodane', () => {
    expect(ledgerLines(-7)).toEqual([-2, -4, -6])
    expect(ledgerLines(-2)).toEqual([-2])
    expect(ledgerLines(-1)).toEqual([])
    expect(ledgerLines(9)).toEqual([])
    expect(ledgerLines(11)).toEqual([10])
    expect(ledgerLines(4)).toEqual([])
  })

  it('cała I pozycja mieści się między 3 liniami dodanymi na dole a polem nad pięciolinią', () => {
    const positions = FIRST_POSITION.map((n) => guitarStaffPosition(n.midi))
    expect(Math.min(...positions)).toBe(-7)
    expect(Math.max(...positions)).toBe(9) // G4 → zapis G5
  })

  it('laska w górę poniżej środkowej linii', () => {
    expect(stemUp(3)).toBe(true)
    expect(stemUp(4)).toBe(false)
  })

  it('krzyżyk: nuta na miejscu nuty o półton niższej, ze znakiem ♯', () => {
    expect(staffPosition(66)).toBe(staffPosition(65)) // F♯5 tam, gdzie F5
    expect(guitarStaffPosition(42)).toBe(-6) // F♯2 → zapis F♯3, na trzeciej linii dodanej
    expect(hasSharp(66)).toBe(true)
    expect(hasSharp(65)).toBe(false)
    expect(FIRST_POSITION.filter((n) => hasSharp(n.midi)).map((n) => n.name)).toEqual(['F♯', 'A♯', 'D♯', 'G♯', 'A♯', 'C♯', 'F♯'])
  })
})
