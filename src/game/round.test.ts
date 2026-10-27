import { describe, expect, it } from 'vitest'
import { FIRST_POSITION, FIRST_POSITION_NATURALS } from '../music/firstPosition'
import { LEVELS, ROUND_LENGTH, currentNote, hit, isFinished, miss, newRound, pickNotes, roundXp } from './round'

/** Prosty powtarzalny generator liczb losowych (do testów). */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31
    return seed / 2 ** 31
  }
}

describe('pickNotes', () => {
  it('losuje nuty z puli, nigdy tej samej dwa razy z rzędu', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const notes = pickNotes(FIRST_POSITION_NATURALS, 30, seeded(seed))
      expect(notes).toHaveLength(30)
      notes.forEach((n) => expect(FIRST_POSITION_NATURALS).toContain(n))
      notes.slice(1).forEach((n, i) => expect(n.midi).not.toBe(notes[i].midi))
    }
  })

  it('przy „losowaniu” zawsze 0 nuty i tak się zmieniają', () => {
    const notes = pickNotes(FIRST_POSITION, 4, () => 0)
    expect(notes.map((n) => n.midi)).toEqual([40, 41, 40, 41])
  })
})

describe('poziomy', () => {
  it('łatwy: bez krzyżyków, z gryfem; trudny: wszystkie 24 nuty, bez gryfu', () => {
    expect(LEVELS.easy.notes.every((n) => !n.sharp)).toBe(true)
    expect(LEVELS.easy.showFretboard).toBe(true)
    expect(LEVELS.hard.notes).toHaveLength(24)
    expect(LEVELS.hard.showFretboard).toBe(false)
  })
})

describe('przebieg rundy', () => {
  it('trafienia przesuwają do kolejnej nuty aż do końca', () => {
    let r = newRound('easy', seeded(7))
    expect(r.notes).toHaveLength(ROUND_LENGTH)
    for (let i = 0; i < ROUND_LENGTH; i++) {
      expect(currentNote(r)).toBe(r.notes[i])
      r = hit(r)
    }
    expect(isFinished(r)).toBe(true)
    expect(currentNote(r)).toBeNull()
    expect(r.firstTry).toBe(ROUND_LENGTH)
    expect(hit(r)).toBe(r) // po końcu nic się nie zmienia
  })

  it('pomyłka zabiera tylko „za pierwszym razem” bieżącej nuty', () => {
    let r = newRound('hard', seeded(3))
    r = miss(miss(r)) // dwie pomyłki przy jednej nucie
    expect(r.index).toBe(0)
    r = hit(r)
    expect(r.missed).toBe(false)
    r = hit(r)
    expect(r).toMatchObject({ index: 2, firstTry: 1, results: [false, true] })
  })
})

describe('roundXp', () => {
  it('łatwy: 2 nutki za rundę, niezależnie od pomyłek', () => {
    expect(roundXp('easy', 10)).toBe(2)
    expect(roundXp('easy', 0)).toBe(2)
  })

  it('trudny: 1 nutka za każde trafienie za pierwszym razem + 2 za rundę', () => {
    expect(roundXp('hard', 10)).toBe(12)
    expect(roundXp('hard', 7)).toBe(9)
    expect(roundXp('hard', 0)).toBe(2)
  })
})
