import { useCallback, useEffect, useRef, useState } from 'react'
import { resumeAudio } from '../../audio/audioContext'
import { microphoneErrorMessage, openMicrophone, type Microphone } from '../../audio/microphone'
import { createMedianFilter } from '../../audio/pitch/median'
import { detectPitch, rms } from '../../audio/pitch/yin'

/** Poniżej tej głośności traktujemy dźwięk jako ciszę / szum tła. */
const SILENCE_RMS = 0.01
/** Jak długo pokazujemy ostatni odczyt po wybrzmieniu struny. */
const HOLD_MS = 1500

export type TunerState =
  | { status: 'idle' }
  | { status: 'starting' }
  | { status: 'listening'; freq: number | null }
  | { status: 'error'; message: string }

export function useTuner() {
  const [state, setState] = useState<TunerState>({ status: 'idle' })
  const micRef = useRef<Microphone | null>(null)
  const frameRef = useRef(0)

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    micRef.current?.stop()
    micRef.current = null
    setState({ status: 'idle' })
  }, [])

  const start = useCallback(async () => {
    setState({ status: 'starting' })
    try {
      const ctx = await resumeAudio()
      const mic = await openMicrophone(ctx)
      micRef.current = mic

      const buffer = new Float32Array(mic.analyser.fftSize)
      const median = createMedianFilter(5)
      let lastHeard = 0
      let frame = 0
      setState({ status: 'listening', freq: null })

      const loop = () => {
        frameRef.current = requestAnimationFrame(loop)
        // Analiza co drugą klatkę (~30×/s) – wystarczy dla oka, oszczędza baterię telefonu.
        if (frame++ % 2) return

        mic.analyser.getFloatTimeDomainData(buffer)
        const now = performance.now()
        const freq = rms(buffer) >= SILENCE_RMS ? detectPitch(buffer, ctx.sampleRate) : null

        if (freq !== null) {
          lastHeard = now
          setState({ status: 'listening', freq: median.push(freq) })
        } else if (lastHeard && now - lastHeard > HOLD_MS) {
          lastHeard = 0
          median.reset()
          setState({ status: 'listening', freq: null })
        }
      }
      loop()
    } catch (error) {
      setState({ status: 'error', message: microphoneErrorMessage(error) })
    }
  }, [])

  // Wyłącz mikrofon, gdy użytkownik przejdzie na inną zakładkę aplikacji.
  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current)
      micRef.current?.stop()
    },
    [],
  )

  return { state, start, stop }
}
