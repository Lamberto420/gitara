import { describe, expect, it } from 'vitest'
import { FIRST_POSITION, naturalName } from './firstPosition'
import { guitarStaffPosition, ledgerLines, staffPosition, stemUp } from './staff'

const label = (n: (typeof FIRST_POSITION)[number]) => `${n.name}${n.octave}:${n.string}/${n.fret}`

describe('FIRST_POSITION', () => {
  it('17 nut naturalnych od E2 do G4, każda struna od pustej do 3. progu', () => {
    expect(FIRST_POSITION.map(label)).toEqual([
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

  it('polska nazwa H, dźwięki z krzyżykiem bez nazwy', () => {
    expect(naturalName(59)).toBe('H')
    expect(naturalName(58)).toBeNull() // B / A♯
    expect(naturalName(66)).toBeNull() // F♯
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

  it('dźwięk z krzyżykiem jeszcze nieobsługiwany – wyraźny błąd zamiast złej pozycji', () => {
    expect(() => staffPosition(66)).toThrow()
  })
})
