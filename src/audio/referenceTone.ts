// Dźwięk wzorcowy struny: kilka harmonicznych z wybrzmiewaniem, jak szarpnięta struna.
// Harmoniczne są ważne – głośnik telefonu prawie nie gra 82 Hz (E2), ale ucho
// „dopowiada” podstawę z wyższych składowych i słyszy właściwą wysokość.

import { pluckSamples } from './pluck'

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

/** Najdłuższe wybrzmiewanie szarpniętej nuty (dalej i tak jest już prawie cisza). */
export const PLUCK_RING_S = 3
/** Wygaszenie przy tłumieniu struny – krótkie, ale bez trzasku. */
const DAMP_S = 0.04

const pluckCache = new Map<string, AudioBuffer>()

function pluckBuffer(ctx: AudioContext, freq: number): AudioBuffer {
  const key = `${ctx.sampleRate}:${freq.toFixed(3)}`
  let buffer = pluckCache.get(key)
  if (!buffer) {
    const samples = pluckSamples(freq, ctx.sampleRate, PLUCK_RING_S)
    buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate)
    buffer.copyToChannel(samples, 0)
    pluckCache.set(key, buffer)
  }
  return buffer
}

/**
 * Szarpnięta struna (melodie w „Piosenkach”): brzmi jak gitara, wybrzmiewa sama.
 * `duration` – po tym czasie strunę tłumimy (np. następna nuta na tej samej strunie).
 */
export function playPluck(ctx: AudioContext, freq: number, start = ctx.currentTime, duration = PLUCK_RING_S): () => void {
  const source = ctx.createBufferSource()
  source.buffer = pluckBuffer(ctx, freq)
  const gain = ctx.createGain()
  const end = start + Math.min(duration, PLUCK_RING_S)
  gain.gain.setValueAtTime(0.35, start)
  gain.gain.setValueAtTime(0.35, Math.max(start, end - DAMP_S))
  gain.gain.linearRampToValueAtTime(0.0001, end)
  // Pudło gitary klasycznej łagodzi najwyższe składowe – ciepłe, nie „cykające” brzmienie.
  const body = ctx.createBiquadFilter()
  body.type = 'lowpass'
  body.frequency.value = 3500
  body.Q.value = 0.5
  source.connect(gain).connect(body).connect(ctx.destination)
  source.start(start)
  source.stop(end)

  playingUntil = Math.max(playingUntil, end)
  return () => {
    body.disconnect()
    source.stop()
    playingUntil = Math.min(playingUntil, ctx.currentTime)
  }
}
