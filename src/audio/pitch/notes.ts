export const A4 = 440

export interface GuitarString {
  /** Numer struny jak u gitarzysty: 1 = najcieńsza (E4), 6 = najgrubsza (E2). */
  number: number
  name: string
  octave: number
  midi: number
  freq: number
}

export function midiToFreq(midi: number, a4 = A4): number {
  return a4 * 2 ** ((midi - 69) / 12)
}

function guitarString(number: number, name: string, octave: number, midi: number): GuitarString {
  return { number, name, octave, midi, freq: midiToFreq(midi) }
}

/** Strój standardowy EADGBE, od najgrubszej struny. */
export const STANDARD_TUNING: readonly GuitarString[] = [
  guitarString(6, 'E', 2, 40),
  guitarString(5, 'A', 2, 45),
  guitarString(4, 'D', 3, 50),
  guitarString(3, 'G', 3, 55),
  guitarString(2, 'H', 3, 59), // w Polsce B nazywamy H
  guitarString(1, 'E', 4, 64),
]

/** Odległość w centach (100 centów = półton). Dodatnia = za wysoko. */
export function cents(freq: number, reference: number): number {
  return 1200 * Math.log2(freq / reference)
}

export function nearestString(freq: number, strings = STANDARD_TUNING): GuitarString {
  let best = strings[0]
  for (const s of strings) {
    if (Math.abs(cents(freq, s.freq)) < Math.abs(cents(freq, best.freq))) best = s
  }
  return best
}

export type TuneStatus = 'in-tune' | 'close' | 'far'

export const IN_TUNE_CENTS = 5
export const CLOSE_CENTS = 15

export function tuneStatus(c: number): TuneStatus {
  const abs = Math.abs(c)
  if (abs <= IN_TUNE_CENTS) return 'in-tune'
  if (abs <= CLOSE_CENTS) return 'close'
  return 'far'
}

/** Powyżej tej odległości od zablokowanej struny pewnie gra inna struna. */
export const WRONG_STRING_CENTS = 300

export interface Reading {
  string: GuitarString
  cents: number
  status: TuneStatus
  /** Struna zablokowana, a dźwięk jest od niej dalej niż ±3 półtony. */
  wrongString: boolean
}

/**
 * Porównuje częstotliwość ze struną: zablokowaną (gdy `locked`) albo najbliższą (tryb auto).
 * Blokada pomaga przy mocno rozstrojonej strunie, którą tryb auto wziąłby za sąsiednią.
 */
export function analyze(freq: number, locked: GuitarString | null = null): Reading {
  const string = locked ?? nearestString(freq)
  const c = cents(freq, string.freq)
  return {
    string,
    cents: c,
    status: tuneStatus(c),
    wrongString: locked !== null && Math.abs(c) > WRONG_STRING_CENTS,
  }
}

/**
 * Zakres wysokości, który licznik ćwiczeń uznaje za grę na gitarze: od nieco poniżej E2
 * (rozstrojona struna) do ok. 19. progu na strunie E4. Szum i stuknięcia nie mają wysokości
 * w ogóle, a piski i świsty wypadają powyżej.
 */
export const GUITAR_MIN_HZ = 70
export const GUITAR_MAX_HZ = 1400

export function isGuitarPitch(freq: number | null): boolean {
  return freq !== null && freq >= GUITAR_MIN_HZ && freq <= GUITAR_MAX_HZ
}

/** Częstotliwość → numer MIDI z ułamkiem (69 = A4). Zaokrąglenie daje najbliższy półton. */
export function freqToMidi(freq: number, a4 = A4): number {
  return 69 + 12 * Math.log2(freq / a4)
}
