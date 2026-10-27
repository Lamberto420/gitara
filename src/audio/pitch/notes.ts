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
