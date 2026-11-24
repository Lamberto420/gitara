import { describe, expect, it } from 'vitest'
import { SONGS } from '../music/songs'
import {
  countVerdicts,
  gradeRhythm,
  rhythmCrown,
  rhythmPlan,
  rhythmPosition,
  rhythmResult,
  rhythmXp,
  type Heard,
  type RhythmPlan,
} from './rhythmRun'

const song = (id: string) => SONGS.find((s) => s.id === id)!
const mary = song('mary-lamb') // 4/4, 100 BPM, 26 nut, bez przedtaktu

/** Gra „idealna co do wysokości”: każda nuta z opóźnieniem `offset` + odchyłka `jitter(i)`. */
function play(plan: RhythmPlan, offset: number, jitter: (i: number) => number = () => 0): Heard[] {
  return plan.notes.map((n, i) => ({ time: n.time + offset + jitter(i), midi: n.note.note.midi }))
}

const verdicts = (plan: RhythmPlan, heard: Heard[]) => gradeRhythm(plan, heard).notes.map((n) => n.verdict)

describe('rhythmPlan', () => {
  it('takt wejścia, potem nuty w tempie; tyki co ćwierćnutę z akcentem na „raz”', () => {
    const plan = rhythmPlan(mary, 'song', 100)
    expect(plan.beat).toBeCloseTo(0.6)
    expect(plan.notes).toHaveLength(26)
    // Takt wejścia = 4 ćwierćnuty po 0,6 s → pierwsza nuta po 2,4 s.
    expect(plan.notes.slice(0, 7).map((n) => +n.time.toFixed(2))).toEqual([2.4, 3, 3.6, 4.2, 4.8, 5.4, 6])
    // 8 taktów + wejście = 36 ćwierćnut; ostatnia nuta (cała) zaczyna się w 19,2 s i trwa do 21,6 s.
    expect(plan.clicks).toHaveLength(36)
    expect(plan.clicks.filter((c) => c.accent).map((c) => +c.time.toFixed(2))).toEqual([0, 2.4, 4.8, 7.2, 9.6, 12, 14.4, 16.8, 19.2])
    expect(plan.notes.at(-1)!.time).toBeCloseTo(19.2)
    expect(plan.finishAt).toBeCloseTo(21.6)
  })

  it('wolniejsze tempo rozciąga wszystko', () => {
    const slow = rhythmPlan(mary, 'song', 50)
    expect(slow.beat).toBeCloseTo(1.2)
    expect(slow.notes[1].time).toBeCloseTo(6)
  })

  it('przedtakt („Happy Birthday”, 3/4): pierwsza nuta w swoim miejscu taktu, nie na „raz”', () => {
    const plan = rhythmPlan(song('happy-birthday'), 'song', 100)
    const sixteenth = plan.beat / 4
    // Takt wejścia (12 szesnastek) + przedtakt zaczyna się 8 szesnastek po „raz”; potem ósemka z kropką.
    expect(plan.notes[0].time).toBeCloseTo(20 * sixteenth)
    expect(plan.notes[1].time).toBeCloseTo(23 * sixteenth)
    expect(plan.notes[2].time).toBeCloseTo(24 * sixteenth) // „raz” pierwszego pełnego taktu
    expect(plan.clicks.filter((c) => c.accent).map((c) => Math.round(c.time / sixteenth))).toContain(24)
  })

  it('fraza: tylko jej nuty, numery do podświetlania, start od taktu wejścia', () => {
    const plan = rhythmPlan(mary, 1, 100)
    expect(plan.notes.map((n) => [n.phrase, n.inPhrase])).toEqual([[1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5]])
    expect(plan.notes[0].time).toBeCloseTo(2.4)
    expect(() => rhythmPlan(mary, 9, 100)).toThrow()
  })
})

describe('gradeRhythm', () => {
  const plan = rhythmPlan(mary, 'song', 100)

  it('równo z opóźnieniem sprzętu – wszystko w czasie, opóźnienie wyznaczone', () => {
    const grade = gradeRhythm(plan, play(plan, 0.3))
    expect(grade.offset).toBeCloseTo(0.3)
    expect(countVerdicts(grade, 'ok')).toBe(26)
  })

  it('ludzki rozrzut ±60 ms – nadal w czasie', () => {
    expect(countVerdicts(gradeRhythm(plan, play(plan, 0.28, (i) => (i % 2 ? 0.06 : -0.06))), 'ok')).toBe(26)
  })

  it('za wcześnie, za późno, zła nuta, brak – każda nuta osobno', () => {
    const heard = play(plan, 0.3, (i) => (i === 3 ? 0.18 : i === 5 ? -0.18 : 0))
    heard[8] = { ...heard[8], midi: heard[8].midi! + 2 }
    heard.splice(10, 1) // nuta 10 nie zagrana
    const v = verdicts(plan, heard)
    expect(v[3]).toBe('late')
    expect(v[5]).toBe('early')
    expect(v[8]).toBe('wrong')
    expect(v[10]).toBe('missed')
    expect(v.filter((x) => x === 'ok')).toHaveLength(22)
  })

  it('dodatkowe dźwięki (inne nuty między tykami) nie szkodzą', () => {
    const extra = plan.notes.map((n) => ({ time: n.time + 0.3 + 0.25, midi: 40 }))
    expect(countVerdicts(gradeRhythm(plan, [...play(plan, 0.3), ...extra]), 'ok')).toBe(26)
  })

  it('szybkie ósemki („Panie Janie”) przy opóźnieniu dłuższym niż ósemka – opóźnienie nie myli się o nutę', () => {
    const fast = rhythmPlan(song('panie-janie'), 'song', 100)
    const grade = gradeRhythm(fast, play(fast, 0.4, (i) => (i % 3) * 0.02))
    expect(grade.offset).toBeGreaterThan(0.39)
    expect(grade.offset).toBeLessThan(0.43)
    expect(countVerdicts(grade, 'ok')).toBe(fast.notes.length)
  })

  it('próba struny w takcie wejścia (ta sama nuta co pierwsza) nie psuje opóźnienia', () => {
    const tryout = { time: plan.notes[0].time - 0.1, midi: plan.notes[0].note.note.midi }
    const grade = gradeRhythm(plan, [tryout, ...play(plan, 0.3)])
    expect(grade.offset).toBeCloseTo(0.3)
    expect(countVerdicts(grade, 'ok')).toBe(26)
  })

  it('pominięta ósemka – brak tylko jej, sąsiednia nuta nie zajmuje jej miejsca', () => {
    const fast = rhythmPlan(song('panie-janie'), 'song', 100)
    const eighth = fast.notes.findIndex((n, i) => i > 0 && fast.notes[i + 1] && fast.notes[i + 1].time - n.time < fast.beat * 0.6)
    const heard = play(fast, 0.3)
    heard.splice(eighth, 1)
    const v = verdicts(fast, heard)
    expect(v[eighth]).toBe('missed')
    expect(v.filter((x) => x !== 'ok')).toHaveLength(1)
  })

  it('brzęczenie innej struny tuż przy nucie – liczy się właściwa nuta', () => {
    const heard = play(plan, 0.3, (i) => (i === 4 ? 0.06 : 0))
    heard.push({ time: plan.notes[4].time + 0.3, midi: 40 }) // brzęczy chwilę PRZED nutą
    heard.sort((a, b) => a.time - b.time) // jak z mikrofonu – w kolejności czasu
    expect(verdicts(plan, heard)[4]).toBe('ok')
  })

  it('granie coraz wolniej (o 30 ms na nutę) – nie przechodzi', () => {
    const grade = gradeRhythm(plan, play(plan, 0.3, (i) => i * 0.03))
    expect(countVerdicts(grade, 'ok') * 100).toBeLessThan(26 * 85)
  })

  it('nic nie zagrane – wszystko „brak”, bez nutek', () => {
    const grade = gradeRhythm(plan, [])
    expect(countVerdicts(grade, 'missed')).toBe(26)
    expect(rhythmXp(plan, grade)).toBe(0)
  })
})

describe('korona 3 i nutki', () => {
  const plan = rhythmPlan(mary, 'song', 100)
  /** Gra z `missing` pominiętymi nutami (od końca). */
  const withMissing = (p: RhythmPlan, missing: number) => gradeRhythm(p, play(p, 0.3).slice(0, p.notes.length - missing))

  it('próg 85%: 23 z 26 – korona, 22 z 26 – nie', () => {
    expect(rhythmCrown(plan, withMissing(plan, 3))).toBe(3) // 88%
    expect(rhythmCrown(plan, withMissing(plan, 4))).toBe(0) // 84,6%
  })

  it('wolniejsze tempo i fraza – nutki bez korony', () => {
    const slow = rhythmPlan(mary, 'song', 75)
    expect(rhythmCrown(slow, withMissing(slow, 0))).toBe(0)
    expect(rhythmXp(slow, withMissing(slow, 0))).toBe(3)
    const phrase = rhythmPlan(mary, 0, 100)
    expect(rhythmCrown(phrase, withMissing(phrase, 0))).toBe(0)
    expect(rhythmXp(phrase, withMissing(phrase, 0))).toBe(1)
  })

  it('nutki od połowy zagranych nut (w czasie czy nie)', () => {
    expect(rhythmXp(plan, withMissing(plan, 13))).toBe(3) // 13 z 26
    expect(rhythmXp(plan, withMissing(plan, 14))).toBe(0)
    // Zagrane, ale nierówno – też się liczą do nutek.
    const uneven = gradeRhythm(plan, play(plan, 0.3, (i) => [-0.2, 0, 0.2][i % 3]))
    expect(countVerdicts(uneven, 'ok') * 2).toBeLessThan(26) // w czasie mniej niż połowa
    expect(rhythmXp(plan, uneven)).toBe(3)
  })

  it('wynik do zdarzenia: tryb rytm, tempo, „za pierwszym razem” = w czasie', () => {
    expect(rhythmResult(plan, withMissing(plan, 2))).toEqual({
      songId: 'mary-lamb',
      scope: 'song',
      mode: 'rhythm',
      tempo: 100,
      notes: 26,
      firstTry: 24,
      crown: 3,
      xp: 3,
    })
  })
})

describe('rhythmPosition', () => {
  it('w takcie wejścia nic, potem nuta, której czas nadszedł', () => {
    const plan = rhythmPlan(mary, 'song', 100)
    expect(rhythmPosition(plan, 0)).toBeNull()
    expect(rhythmPosition(plan, 2.39)).toBeNull()
    expect(rhythmPosition(plan, 2.4)).toBe(0)
    expect(rhythmPosition(plan, 3.5)).toBe(1)
    expect(rhythmPosition(plan, 100)).toBe(25)
  })
})
