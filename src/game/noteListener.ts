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

/**
 * Ponowne szarpnięcie tej samej struny: głośność skacze co najmniej tyle razy ponad najcichszy
 * moment od poprzedniego szarpnięcia (wybrzmiewająca struna cichnie, nowe uderzenie ją podbija).
 * Zwykłe wahania głośności trzymanego dźwięku są dużo mniejsze.
 */
export const ONSET_RATIO = 1.6

export type Heard = { kind: 'hit' } | { kind: 'wrong'; midi: number }

export interface NoteListener {
  /**
   * Kolejny odczyt: chwila (ms), częstotliwość (null = cisza) i głośność (RMS; bez niej
   * ponowne szarpnięcie rozpoznajemy tylko po ciszy). Zwraca rozstrzygnięcie albo null.
   */
  update(at: number, freq: number | null, level?: number): Heard | null
}

/**
 * `target` – nuta do zagrania (wysokość brzmienia, MIDI). Tolerancja ±50 centów: dziecięca gitara
 * bywa lekko rozstrojona, a pół tonu dalej to już inna nuta. Nuta o oktawę wyżej/niżej
 * to inne miejsce na pięciolinii, więc się nie liczy.
 * `ignore` – poprzednia nuta: jeszcze wybrzmiewa po trafieniu i nie może być „błędem”.
 * Gdy poprzednia nuta jest TAKA SAMA jak docelowa (piosenka: „A A A A”), jej wybrzmiewanie nie może
 * od razu zaliczyć następnej – czekamy na nowe szarpnięcie: ciszę albo skok głośności.
 */
export function createNoteListener(target: number, ignore: number | null = null): NoteListener {
  let candidate: number | null = null
  let since = 0
  /** Ten ciąg odczytów został już rozstrzygnięty – nie zgłaszamy go drugi raz. */
  let reported = false
  /** Czy już słychać nowe szarpnięcie (potrzebne tylko przy powtórzonej nucie). */
  let attacked = target !== ignore
  /** Najcichszy odczyt od początku słuchania – punkt odniesienia dla skoku głośności. */
  let floor = Infinity

  return {
    update(at, freq, level) {
      const midi = freq === null ? null : Math.round(freqToMidi(freq))
      if (midi === null) attacked = true
      if (level !== undefined && !attacked) {
        if (level >= floor * ONSET_RATIO) {
          attacked = true
          // Nowe szarpnięcie zaczyna nowy ciąg – czas trzymania liczymy od niego.
          candidate = null
        }
        floor = Math.min(floor, level)
      }
      if (midi !== candidate) {
        candidate = midi
        since = at
        reported = false
      }
      if (candidate === null || reported) return null

      const held = at - since
      if (candidate === target && attacked && held >= HIT_MS) {
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
