// Krótkie „dzyń-dzyń” po trafionej nucie w grze. Wysoko (G6–C7), ponad zakresem gitary,
// a mikrofon i tak je pomija (isChimePlaying), żeby gra nie wzięła go za zagraną nutę.
import { midiToFreq } from './pitch/notes'

const NOTES = [91, 96] // G6 C7
const STEP_S = 0.09
const LENGTH_S = 0.25

let playingUntil = 0

export function playChime(ctx: AudioContext): void {
  const start = ctx.currentTime + 0.01
  NOTES.forEach((midi, i) => {
    const t = start + i * STEP_S
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = midiToFreq(midi)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + LENGTH_S)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + LENGTH_S + 0.02)
  })
  // Zapas na pogłos w pokoju.
  playingUntil = start + (NOTES.length - 1) * STEP_S + LENGTH_S + 0.1
}

export function isChimePlaying(ctx: AudioContext): boolean {
  return ctx.currentTime < playingUntil
}
