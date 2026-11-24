// Wykrywanie szarpnięć (ataków) z czasem co do próbki – do gry w rytmie.
// Pętla mikrofonu stroika patrzy co ~33 ms na ~85 ms dźwięku: dobra do wysokości, za mało dokładna
// do rytmu. Tu dostajemy każdą próbkę z numerem na zegarze audio (ten sam zegar co tyki metronomu).
//
// Obwiednia „szczyt z powolnym opadaniem”: przy ataku skacze od razu, a między okresami najniższej
// struny (E 82 Hz = 12 ms) opada tylko trochę – więc nowe szarpnięcie to wyraźny skok ponad niedawne
// minimum, także na wciąż brzmiącej strunie (ta sama nuta powtórzona). Sprawdzone prototypem (#3).
import { detectPitch } from './pitch/yin'

/** Dlaczego dźwięk nie jest nutą. */
export type OnsetRejection =
  /** Krótki dźwięk bez wybrzmiewania – tyk metronomu z głośnika, stuk. */
  | 'short'
  /** Zaraz po nim (< 100 ms) przyszedł inny dźwięk – to on jest nutą (np. tyk tuż przed nią). */
  | 'before-other'
  /** Tuż po wyraźnie mocniejszym dźwięku – jego echo albo zakłócenie. */
  | 'after-stronger'
  /** Brak wyraźnej wysokości (szum). */
  | 'no-pitch'

export interface Onset {
  /** Chwila ataku na zegarze audio (s). */
  time: number
  /** Najwyższa głośność w pierwszych 30 ms. */
  peak: number
  /** Wysokość zaraz po ataku (Hz) albo null. */
  freq: number | null
  /** Czy to szarpnięta struna. */
  note: boolean
  reason?: OnsetRejection
}

/** Opadanie obwiedni (stała czasowa). */
const RELEASE_S = 0.05
/** Jak daleko wstecz szukamy „tła” dla nowego ataku. */
const LOOKBACK_S = 0.06
/** Atak = obwiednia co najmniej tyle razy wyżej niż tło. */
const RATIO = 2
/** Ciszej niż to (szczyt próbki) – szum, nie gramy. */
const MIN_LEVEL = 0.01
/** Martwy czas po ataku. Krótszy niż tyk (~50 ms) – nuta tuż po tyku z głośnika nie zleje się z nim. */
const REFRACTORY_S = 0.05
/** Narastanie ataku: wykrywamy go na pierwszych, jeszcze cichych próbkach – nie są „tłem” dla dalszej części nuty. */
const ATTACK_S = 0.015
/** Szczyt i wysokość mierzymy w tym oknie po ataku. */
const PEAK_S = 0.03
const PITCH_WINDOW = 2048
/** Po tylu sekundach struna wciąż brzmi (≥ SUSTAIN_FRACTION szczytu), a tyk/stuk już zgasł. */
const CHECK_S = 0.15
const SUSTAIN_FRACTION = 0.3
/** Dwa ataki bliżej niż to to nie dwie nuty – tak szybko w I pozycji się nie gra. */
const SUPERSEDE_S = 0.1
/** „Wyraźnie mocniejszy” pierwszy dźwięk z pary – wtedy zostaje on, a nie późniejszy. */
const STRONGER = 1.5
/** Pamiętamy tyle ostatnich próbek – starcza na okno YIN po CHECK_S. */
const KEEP_S = 1

interface Pending {
  frame: number
  onset: Onset
  reject?: OnsetRejection
}

/**
 * Wykrywacz dla jednego strumienia. `push` przyjmuje kolejne paczki próbek (dowolnej długości)
 * z numerem pierwszej próbki; `take` oddaje szarpnięcia już ocenione (nuta albo powód odrzucenia) –
 * ocena wymaga CHECK_S dźwięku po ataku, więc przychodzą z takim opóźnieniem.
 */
export function createOnsetDetector(sampleRate: number) {
  const keep = Math.ceil(sampleRate * KEEP_S)
  const samples = new Float32Array(keep)
  const env = new Float32Array(keep)
  const release = Math.exp(-1 / (RELEASE_S * sampleRate))
  const lookback = Math.round(LOOKBACK_S * sampleRate)
  const refractory = Math.round(REFRACTORY_S * sampleRate)
  const attack = Math.round(ATTACK_S * sampleRate)
  const peakFrames = Math.round(PEAK_S * sampleRate)
  const check = Math.round(CHECK_S * sampleRate)
  const supersede = Math.round(SUPERSEDE_S * sampleRate)
  const ready = Math.max(check, peakFrames + PITCH_WINDOW) // ile próbek po ataku potrzeba do oceny
  const pending: Pending[] = []
  let done: Onset[] = []
  let frame = -1 // numer ostatniej przetworzonej próbki
  let level = 0
  let lastOnset = -Infinity
  // Minimum obwiedni w oknie wstecz – przeliczane co 64 próbki (dość dokładnie, dużo taniej).
  // Po ataku przeliczy się samo przed końcem martwego czasu (REFRACTORY_S ≫ 64 próbki).
  let windowMin = Infinity
  let windowMinAt = -Infinity

  const at = (f: number) => ((f % keep) + keep) % keep

  function background(f: number): number {
    if (f - windowMinAt > 64) {
      let m = Infinity
      // Nie sięgamy przed ostatnie szarpnięcie ani w jego narastanie.
      for (let g = Math.max(0, f - lookback, lastOnset + attack); g < f; g++) m = Math.min(m, env[at(g)])
      windowMin = m
      windowMinAt = f
    }
    return windowMin
  }

  const peakAfter = (f: number) => {
    let peak = 0
    for (let g = f; g < f + peakFrames; g++) peak = Math.max(peak, env[at(g)])
    return peak
  }

  function judge(p: Pending): Onset {
    const o = p.onset
    o.peak = peakAfter(p.frame)
    const window = new Float32Array(PITCH_WINDOW)
    for (let i = 0; i < PITCH_WINDOW; i++) window[i] = samples[at(p.frame + peakFrames + i)]
    o.freq = detectPitch(window, sampleRate, { minFreq: 70, maxFreq: 1400 })
    // Para ataków blisko siebie (np. tyk z głośnika i zaraz nuta): brzmienie „później” należy do
    // nuty, więc samo wybrzmiewanie ich nie rozróżni. Zostaje późniejszy, chyba że pierwszy jest
    // wyraźnie mocniejszy.
    const next = pending[0]
    if (next && next.frame - p.frame < supersede) {
      if (peakAfter(next.frame) * STRONGER < o.peak) next.reject = 'after-stronger'
      else p.reject ??= 'before-other'
    }
    if (p.reject) o.reason = p.reject
    else if (env[at(p.frame + check)] < o.peak * SUSTAIN_FRACTION) o.reason = 'short'
    else if (o.freq === null) o.reason = 'no-pitch'
    o.note = !o.reason
    return o
  }

  /** Kolejna paczka próbek; `startFrame` = numer pierwszej z nich na zegarze audio. */
  function push(startFrame: number, data: Float32Array) {
    for (let i = 0; i < data.length; i++) {
      const f = startFrame + i
      if (f <= frame) continue // powtórzone próbki
      frame = f
      samples[at(f)] = data[i]
      level = Math.max(Math.abs(data[i]), level * release)
      env[at(f)] = level
      if (f - lastOnset > refractory && level > MIN_LEVEL && level > RATIO * background(f)) {
        lastOnset = f
        pending.push({ frame: f, onset: { time: f / sampleRate, peak: level, freq: null, note: false } })
      }
      while (pending.length && f >= pending[0].frame + ready) done.push(judge(pending.shift()!))
    }
  }

  /** Ocenione szarpnięcia od poprzedniego wywołania, od najwcześniejszego. */
  function take(): Onset[] {
    const out = done
    done = []
    return out
  }

  return { push, take }
}
