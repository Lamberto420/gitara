// Dźwięk wzorcowy struny: kilka harmonicznych z wybrzmiewaniem, jak szarpnięta struna.
// Harmoniczne są ważne – głośnik telefonu prawie nie gra 82 Hz (E2), ale ucho
// „dopowiada” podstawę z wyższych składowych i słyszy właściwą wysokość.

const DURATION = 2.5 // sekundy
const HARMONICS = [1, 0.5, 0.3, 0.15]

/** Czas (w zegarze AudioContext), do którego gra dźwięk wzorcowy. */
let playingUntil = 0

export function playReferenceTone(ctx: AudioContext, freq: number): void {
  const now = ctx.currentTime
  const output = ctx.createGain()
  output.gain.setValueAtTime(0.0001, now)
  output.gain.exponentialRampToValueAtTime(0.25, now + 0.01) // szybki atak jak przy szarpnięciu
  output.gain.exponentialRampToValueAtTime(0.0001, now + DURATION) // powolne wybrzmiewanie
  output.connect(ctx.destination)

  HARMONICS.forEach((amp, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq * (i + 1)
    gain.gain.value = amp
    osc.connect(gain).connect(output)
    osc.start(now)
    osc.stop(now + DURATION)
  })

  playingUntil = now + DURATION
}

/** Stroik ignoruje mikrofon, gdy gra dźwięk wzorcowy – inaczej „stroiłby” sam siebie. */
export function isReferenceTonePlaying(ctx: AudioContext): boolean {
  return ctx.currentTime < playingUntil
}
