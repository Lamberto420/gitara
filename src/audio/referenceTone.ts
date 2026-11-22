// Dźwięk wzorcowy struny: kilka harmonicznych z wybrzmiewaniem, jak szarpnięta struna.
// Harmoniczne są ważne – głośnik telefonu prawie nie gra 82 Hz (E2), ale ucho
// „dopowiada” podstawę z wyższych składowych i słyszy właściwą wysokość.

const DURATION = 2.5 // sekundy
const HARMONICS = [1, 0.5, 0.3, 0.15]

/** Czas (w zegarze AudioContext), do którego gra dźwięk wzorcowy. */
let playingUntil = 0

/**
 * Jeden dźwięk; `start` i `duration` (sekundy, zegar AudioContext) – do odgrywania melodii.
 * Zwraca funkcję, która ucisza dźwięk od razu (np. przerwanie melodii).
 */
export function playReferenceTone(ctx: AudioContext, freq: number, start = ctx.currentTime, duration = DURATION): () => void {
  const output = ctx.createGain()
  output.gain.setValueAtTime(0.0001, start)
  output.gain.exponentialRampToValueAtTime(0.25, start + 0.01) // szybki atak jak przy szarpnięciu
  output.gain.exponentialRampToValueAtTime(0.0001, start + duration) // wybrzmiewanie
  output.connect(ctx.destination)

  const oscillators = HARMONICS.map((amp, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq * (i + 1)
    gain.gain.value = amp
    osc.connect(gain).connect(output)
    osc.start(start)
    osc.stop(start + duration)
    return osc
  })

  playingUntil = Math.max(playingUntil, start + duration)
  return () => {
    output.disconnect()
    oscillators.forEach((o) => o.stop())
    playingUntil = Math.min(playingUntil, ctx.currentTime)
  }
}

/** Stroik ignoruje mikrofon, gdy gra dźwięk wzorcowy – inaczej „stroiłby” sam siebie. */
export function isReferenceTonePlaying(ctx: AudioContext): boolean {
  return ctx.currentTime < playingUntil
}
