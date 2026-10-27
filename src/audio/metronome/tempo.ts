/** Włoskie nazwy temp z polskim opisem (górna granica BPM, nazwa, opis). */
const TEMPO_NAMES: readonly [number, string, string][] = [
  [59, 'Largo', 'bardzo wolno'],
  [75, 'Adagio', 'wolno'],
  [107, 'Andante', 'spokojnym krokiem'],
  [119, 'Moderato', 'umiarkowanie'],
  [167, 'Allegro', 'szybko, wesoło'],
  [Infinity, 'Presto', 'bardzo szybko'],
]

export function tempoName(bpm: number): { name: string; description: string } {
  const [, name, description] = TEMPO_NAMES.find(([max]) => bpm <= max)!
  return { name, description }
}
