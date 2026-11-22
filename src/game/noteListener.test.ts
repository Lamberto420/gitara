import { describe, expect, it } from 'vitest'
import { midiToFreq } from '../audio/pitch/notes'
import { HIT_MS, ONSET_RATIO, WRONG_MS, createNoteListener, type Heard, type NoteListener } from './noteListener'

const FRAME_MS = 33 // ~30 odczytów na sekundę, jak w aplikacji
const G3 = 55 // pusta struna 3
const A3 = 57 // struna 3, próg 2

/** Odczyty co FRAME_MS od `from` do `to` z tą samą częstotliwością; zwraca wszystkie rozstrzygnięcia. */
function feed(l: NoteListener, from: number, to: number, freq: number | null): Heard[] {
  const out: Heard[] = []
  for (let at = from; at <= to; at += FRAME_MS) {
    const h = l.update(at, freq)
    if (h) out.push(h)
  }
  return out
}

describe('createNoteListener', () => {
  it('zalicza nutę docelową po krótkim stabilnym brzmieniu – i tylko raz', () => {
    const l = createNoteListener(A3)
    expect(feed(l, 0, HIT_MS - FRAME_MS, midiToFreq(A3))).toEqual([])
    expect(feed(l, HIT_MS, 3000, midiToFreq(A3))).toEqual([{ kind: 'hit' }])
  })

  it('toleruje lekkie rozstrojenie (40 centów), ale nie pół tonu', () => {
    expect(feed(createNoteListener(A3), 0, 1000, midiToFreq(A3 + 0.4))).toEqual([{ kind: 'hit' }])
    expect(feed(createNoteListener(A3), 0, 1000, midiToFreq(A3 - 0.4))).toEqual([{ kind: 'hit' }])
    expect(feed(createNoteListener(A3), 0, 1000, midiToFreq(A3 + 1))).toEqual([{ kind: 'wrong', midi: A3 + 1 }])
  })

  it('nuta o oktawę wyżej to inna nuta', () => {
    expect(feed(createNoteListener(A3), 0, 1000, midiToFreq(A3 + 12))).toEqual([{ kind: 'wrong', midi: A3 + 12 }])
  })

  it('inną nutę zgłasza dopiero po dłuższym brzmieniu', () => {
    const l = createNoteListener(A3)
    expect(feed(l, 0, WRONG_MS - FRAME_MS, midiToFreq(G3))).toEqual([])
    expect(feed(l, WRONG_MS, 2000, midiToFreq(G3))).toEqual([{ kind: 'wrong', midi: G3 }])
  })

  it('przelotne nuty po drodze (przesuwanie palca) nie są błędem', () => {
    const l = createNoteListener(A3)
    expect(feed(l, 0, 200, midiToFreq(G3))).toEqual([])
    expect(feed(l, 233, 1000, midiToFreq(A3))).toEqual([{ kind: 'hit' }])
  })

  it('cisza przerywa nutę – trzeba ją zagrać od nowa', () => {
    const l = createNoteListener(A3)
    feed(l, 0, 150, midiToFreq(A3))
    feed(l, 183, 300, null)
    expect(feed(l, 333, 333 + HIT_MS - FRAME_MS, midiToFreq(A3))).toEqual([])
  })

  it('po pomyłce można zagrać ponownie i trafić', () => {
    const l = createNoteListener(A3)
    const heard = [...feed(l, 0, 1000, midiToFreq(G3)), ...feed(l, 1033, 1200, null), ...feed(l, 1233, 2000, midiToFreq(A3))]
    expect(heard).toEqual([{ kind: 'wrong', midi: G3 }, { kind: 'hit' }])
  })

  it('wybrzmiewająca poprzednia nuta nie jest pomyłką', () => {
    const l = createNoteListener(A3, G3)
    expect(feed(l, 0, 2000, midiToFreq(G3))).toEqual([])
  })

  describe('powtórzona nuta (piosenka „A A A A”)', () => {
    /** Wybrzmiewanie: głośność spada z `start` o 3% na odczyt. */
    function ring(l: NoteListener, from: number, to: number, start: number): Heard[] {
      const out: Heard[] = []
      let level = start
      for (let at = from; at <= to; at += FRAME_MS) {
        const h = l.update(at, midiToFreq(A3), level)
        if (h) out.push(h)
        level *= 0.97
      }
      return out
    }

    it('wybrzmiewająca poprzednia (ta sama) nuta nie zalicza następnej', () => {
      const l = createNoteListener(A3, A3)
      expect(ring(l, 0, 3000, 0.2)).toEqual([])
      // Bez głośności też nie – czeka na ciszę.
      expect(feed(createNoteListener(A3, A3), 0, 3000, midiToFreq(A3))).toEqual([])
    })

    it('ponowne szarpnięcie (skok głośności) zalicza – po zwykłym czasie trzymania', () => {
      const l = createNoteListener(A3, A3)
      ring(l, 0, 500, 0.1) // cichnie do ~0,04
      expect(ring(l, 533, 533 + HIT_MS - FRAME_MS, 0.2)).toEqual([])
      expect(ring(l, 533 + HIT_MS, 1500, 0.2 * 0.97 ** 8)).toEqual([{ kind: 'hit' }])
    })

    it('zwykłe wahania głośności to nie szarpnięcie', () => {
      const l = createNoteListener(A3, A3)
      const heard: Heard[] = []
      for (let i = 0, at = 0; i < 90; i++, at += FRAME_MS) {
        const h = l.update(at, midiToFreq(A3), 0.1 * (i % 2 ? ONSET_RATIO * 0.9 : 1))
        if (h) heard.push(h)
      }
      expect(heard).toEqual([])
    })

    it('cisza między nutami też liczy się jako nowe szarpnięcie', () => {
      const l = createNoteListener(A3, A3)
      const heard = [...feed(l, 0, 500, midiToFreq(A3)), ...feed(l, 533, 600, null), ...feed(l, 633, 1500, midiToFreq(A3))]
      expect(heard).toEqual([{ kind: 'hit' }])
    })

    it('przy różnych nutach głośność niczego nie zmienia', () => {
      const l = createNoteListener(A3, G3)
      expect(ring(l, 0, 1000, 0.2)).toEqual([{ kind: 'hit' }])
    })
  })
})
