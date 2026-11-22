// Wspólna pętla słuchania dla gier (Zagraj nutę, piosenki): mikrofon, wykrywanie wysokości,
// filtr medianowy i pomijanie własnych dźwięków aplikacji. Co robić z odczytem – decyduje gra.
import { resumeAudio } from '../../audio/audioContext'
import { isChimePlaying } from '../../audio/chime'
import { isClickSounding } from '../../audio/metronome/click'
import { openMicrophone } from '../../audio/microphone'
import { createMedianFilter } from '../../audio/pitch/median'
import { detectPitch, rms } from '../../audio/pitch/yin'
import { isReferenceTonePlaying } from '../../audio/referenceTone'

/** Ta sama granica ciszy co w stroiku. */
const SILENCE_RMS = 0.01

export interface PitchLoop {
  ctx: AudioContext
  /** Nowa nuta do słuchania – stare odczyty nie mieszają się z nowymi. */
  resetFilter(): void
  stop(): void
}

/**
 * Włącza mikrofon i co drugą klatkę woła `onReading(chwila, częstotliwość | null, głośność)`.
 * `onFrame` – co klatkę przed odczytem; zwraca true, gdy tę klatkę pominąć (np. pauza „brawo”).
 * Rzuca błąd mikrofonu (komunikat: `microphoneErrorMessage`).
 */
export async function startPitchLoop(
  onReading: (at: number, freq: number | null, level: number) => void,
  onFrame: (at: number) => boolean = () => false,
): Promise<PitchLoop> {
  const ctx = await resumeAudio()
  const mic = await openMicrophone(ctx)
  const buffer = new Float32Array(mic.analyser.fftSize)
  const median = createMedianFilter(5)
  let frame = 0
  let raf = 0

  const loop = () => {
    raf = requestAnimationFrame(loop)
    const now = performance.now()
    if (onFrame(now)) return
    if (frame++ % 2) return
    // Własne dźwięki aplikacji to nie gra na gitarze.
    if (isReferenceTonePlaying(ctx) || isClickSounding(ctx) || isChimePlaying(ctx)) return

    mic.analyser.getFloatTimeDomainData(buffer)
    const level = rms(buffer)
    const raw = level >= SILENCE_RMS ? detectPitch(buffer, ctx.sampleRate) : null
    if (raw === null) median.reset()
    onReading(now, raw === null ? null : median.push(raw), level)
  }
  loop()

  return {
    ctx,
    resetFilter: () => median.reset(),
    stop() {
      cancelAnimationFrame(raf)
      mic.stop()
    },
  }
}
