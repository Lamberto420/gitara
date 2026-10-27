// Słuchacz gry „Zagraj nutę”: dostaje kolejne odczyty wysokości z mikrofonu i rozstrzyga,
// czy zabrzmiała nuta docelowa, czy inna. Czysta logika – czas podaje wywołujący.
import { freqToMidi } from '../audio/pitch/notes'

/**
 * Tak długo nuta musi brzmieć stabilnie, żeby ją zaliczyć. Krótko, bo dziecko czeka na
 * „brawo” – ale dłużej niż pojedynczy błędny odczyt (np. przy samym szarpnięciu struny).
 */
export const HIT_MS = 250
/** Inną nutę zgłaszamy później niż trafienie – przy przesuwaniu palca po drodze brzmią sąsiednie. */
export const WRONG_MS = 400

export type Heard = { kind: 'hit' } | { kind: 'wrong'; midi: number }

export interface NoteListener {
  /** Kolejny odczyt: chwila (ms) i częstotliwość (null = cisza). Zwraca rozstrzygnięcie albo null. */
  update(at: number, freq: number | null): Heard | null
}

/**
 * `target` – nuta do zagrania (wysokość brzmienia, MIDI). Tolerancja ±50 centów: dziecięca gitara
 * bywa lekko rozstrojona, a pół tonu dalej to już inna nuta. Nuta o oktawę wyżej/niżej
 * to inne miejsce na pięciolinii, więc się nie liczy.
 * `ignore` – poprzednia nuta: jeszcze wybrzmiewa po trafieniu i nie może być „błędem”.
 */
export function createNoteListener(target: number, ignore: number | null = null): NoteListener {
  let candidate: number | null = null
  let since = 0
  /** Ten ciąg odczytów został już rozstrzygnięty – nie zgłaszamy go drugi raz. */
  let reported = false

  return {
    update(at, freq) {
      const midi = freq === null ? null : Math.round(freqToMidi(freq))
      if (midi !== candidate) {
        candidate = midi
        since = at
        reported = false
      }
      if (candidate === null || reported) return null

      const held = at - since
      if (candidate === target && held >= HIT_MS) {
        reported = true
        return { kind: 'hit' }
      }
      if (candidate !== target && candidate !== ignore && held >= WRONG_MS) {
        reported = true
        return { kind: 'wrong', midi: candidate }
      }
      return null
    },
  }
}
