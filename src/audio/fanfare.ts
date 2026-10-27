// Krótka fanfara przy nagrodzie: wesołe arpeggio C–E–G–C (ok. 1 s).
import { runningAudio } from './audioContext'
import { midiToFreq } from './pitch/notes'

const NOTES = [72, 76, 79, 84] // C5 E5 G5 C6
const STEP_S = 0.11

export function playFanfare(): void {
  // Bez gestu użytkownika dźwięk i tak by nie zagrał – wtedy świętujemy po cichu.
  const ctx = runningAudio()
  if (!ctx) return
  const start = ctx.currentTime + 0.02
  NOTES.forEach((midi, i) => {
    const t = start + i * STEP_S
    const last = i === NOTES.length - 1
    const length = last ? 0.6 : 0.18
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle' // łagodniejszy od piłokształtnego, wyraźniejszy od sinusa na głośniku telefonu
    osc.frequency.value = midiToFreq(midi)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + length + 0.02)
  })
}
