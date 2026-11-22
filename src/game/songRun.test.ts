import { describe, expect, it } from 'vitest'
import { phraseNotes } from '../music/song'
import { SONGS } from '../music/songs'
import {
  PHRASE_XP,
  SONG_XP,
  firstTryCount,
  isRunFinished,
  newSongRun,
  runCrown,
  runHint,
  runHit,
  runMiss,
  runNote,
  runPosition,
  runResult,
  runXp,
  type SongRun,
} from './songRun'

const mary = SONGS.find((s) => s.id === 'mary-lamb')!
const total = mary.phrases.reduce((n, p) => n + phraseNotes(p).length, 0)

/** Gra całą piosenkę; `misses` – numery nut z pomyłką przed trafieniem. */
function play(run: SongRun, misses: ReadonlySet<number> = new Set()): SongRun {
  while (!isRunFinished(run)) {
    if (misses.has(run.index)) run = runMiss(run)
    run = runHit(run)
  }
  return run
}

describe('newSongRun', () => {
  it('fraza: tylko jej nuty, od jej początku', () => {
    const r = newSongRun(mary, 'fretboard', 1)
    expect(r.notes).toEqual(phraseNotes(mary.phrases[1]))
    expect(runNote(r)?.note.midi).toBe(phraseNotes(mary.phrases[1])[0].note.midi)
    expect(runPosition(r)).toEqual({ phrase: 1, note: 0 })
  })

  it('cała piosenka: wszystkie frazy po kolei', () => {
    const r = newSongRun(mary, 'staff', 'song')
    expect(r.notes).toHaveLength(total)
    expect(r.phraseStarts).toEqual([0, 7, 13, 21])
  })

  it('nieistniejąca fraza to błąd', () => {
    expect(() => newSongRun(mary, 'fretboard', 9)).toThrow()
  })
})

describe('przebieg', () => {
  it('pozycja przechodzi z frazy do frazy', () => {
    let r = newSongRun(mary, 'fretboard', 'song')
    for (let i = 0; i < 6; i++) r = runHit(r)
    expect(runPosition(r)).toEqual({ phrase: 0, note: 6 })
    r = runHit(r)
    expect(runPosition(r)).toEqual({ phrase: 1, note: 0 })
    r = play(r)
    // Po końcu: ostatnia fraza, za ostatnią nutą (nic nie podświetlone).
    expect(runPosition(r)).toEqual({ phrase: 3, note: phraseNotes(mary.phrases[3]).length })
  })

  it('pomyłka i podpowiedź zabierają „za pierwszym razem” tylko bieżącej nucie', () => {
    let r = newSongRun(mary, 'staff', 0)
    r = runHit(runMiss(r))
    r = runHit(runHint(r))
    r = runHit(r)
    expect(r.results).toEqual([false, false, true])
    expect(firstTryCount(r)).toBe(1)
  })

  it('po końcu trafienia i pomyłki niczego nie zmieniają', () => {
    const r = play(newSongRun(mary, 'staff', 0))
    expect(runHit(r)).toBe(r)
    expect(runMiss(r)).toBe(r)
  })
})

describe('wynik', () => {
  it('nutki: fraza +1, cała piosenka +3, nieskończone – nic', () => {
    expect(runXp(play(newSongRun(mary, 'fretboard', 2)))).toBe(PHRASE_XP)
    expect(runXp(play(newSongRun(mary, 'fretboard', 'song')))).toBe(SONG_XP)
    expect(runXp(runHit(newSongRun(mary, 'fretboard', 'song')))).toBe(0)
  })

  it('fraza nie daje korony', () => {
    expect(runCrown(play(newSongRun(mary, 'staff', 0)))).toBe(0)
  })

  it('nieskończona piosenka nie daje korony', () => {
    expect(runCrown(runHit(newSongRun(mary, 'staff', 'song')))).toBe(0)
  })

  it('korona 1: cała piosenka z gryfem – nawet bezbłędnie', () => {
    expect(runCrown(play(newSongRun(mary, 'fretboard', 'song')))).toBe(1)
  })

  it('korona 2: bez gryfu i ≥ 90% za pierwszym razem; mniej – korona 1', () => {
    // mary-lamb ma 26 nut: 90% to 23,4 → potrzeba 24 (2 pomyłki można, 3 już nie).
    expect(total).toBe(26)
    expect(runCrown(play(newSongRun(mary, 'staff', 'song'), new Set([0, 5])))).toBe(2)
    expect(runCrown(play(newSongRun(mary, 'staff', 'song'), new Set([0, 5, 9])))).toBe(1)
  })

  it('próg 90% dokładnie: 9 z 10 wystarcza', () => {
    const run = play(newSongRun(mary, 'staff', 'song'))
    const ten = { ...run, notes: run.notes.slice(0, 10), results: [...Array(9).fill(true), false], index: 10 }
    expect(runCrown(ten)).toBe(2)
  })
})

describe('runResult', () => {
  it('wynik do zdarzenia: liczby z przebiegu', () => {
    const r = play(newSongRun(mary, 'staff', 'song'), new Set([3]))
    expect(runResult(r)).toEqual({ songId: 'mary-lamb', scope: 'song', mode: 'staff', notes: 26, firstTry: 25, crown: 2, xp: SONG_XP })
  })
})
