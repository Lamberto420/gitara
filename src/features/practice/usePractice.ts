import { useCallback, useEffect, useRef, useState } from 'react'
import { resumeAudio } from '../../audio/audioContext'
import { isClickSounding } from '../../audio/metronome/click'
import { microphoneErrorMessage, openMicrophone, type Microphone } from '../../audio/microphone'
import { isGuitarPitch } from '../../audio/pitch/notes'
import { detectPitch, rms } from '../../audio/pitch/yin'
import { isReferenceTonePlaying } from '../../audio/referenceTone'
import { practiceEvent } from '../../progress/events'
import { createPracticeTracker } from '../../progress/practiceTracker'
import { keepScreenOn } from '../metronome/wakeLock'
import { useProfiles } from '../profiles/ProfileContext'

/** Ta sama granica ciszy co w stroiku. */
const SILENCE_RMS = 0.01

export type PracticeStatus = 'idle' | 'starting' | 'listening' | 'error'

/**
 * Sesja „Ćwiczę 🎸”: mikrofon słucha, licznik sumuje czas gry, a co pełną minutę
 * zapisujemy zdarzenie `practice` – zamknięcie aplikacji gubi najwyżej ułamek minuty.
 * Komponent z tym hookiem dostaje `key` = id osoby, więc zmiana osoby kończy sesję.
 */
export function usePractice(profileId: string) {
  const { addEvents } = useProfiles()
  const [status, setStatus] = useState<PracticeStatus>('idle')
  const [error, setError] = useState('')
  /** Czy właśnie liczymy granie (do znaczka „słyszę grę”). */
  const [playing, setPlaying] = useState(false)
  /** Sekundy gry w tej sesji, łącznie z już zapisanymi. */
  const [sessionSeconds, setSessionSeconds] = useState(0)
  /** Sekundy policzone, ale jeszcze niezapisane – nagłówek dolicza je do celu na żywo. */
  const [unsavedSeconds, setUnsavedSeconds] = useState(0)

  const stopRef = useRef<(() => void) | null>(null)
  /** Fałsz po odmontowaniu – mikrofon włączony „za późno” trzeba od razu wyłączyć. */
  const aliveRef = useRef(true)

  const start = useCallback(async () => {
    if (stopRef.current) return
    setStatus('starting')
    let mic: Microphone
    let ctx: AudioContext
    try {
      ctx = await resumeAudio()
      mic = await openMicrophone(ctx)
      if (!aliveRef.current) return mic.stop()
    } catch (e) {
      setError(microphoneErrorMessage(e))
      setStatus('error')
      return
    }

    const tracker = createPracticeTracker()
    const buffer = new Float32Array(mic.analyser.fftSize)
    let savedSeconds = 0
    setSessionSeconds(0)
    let frame = 0
    let raf = 0

    const save = (seconds: number) => {
      if (seconds <= 0) return
      savedSeconds += seconds
      addEvents([practiceEvent(profileId, seconds)])
    }
    // Karta chowa się w tle (zamknięcie aplikacji, zgaszony ekran) – zapisz resztę, póki można.
    const onHide = () => {
      if (document.visibilityState === 'hidden') save(tracker.takeRest())
    }

    const loop = () => {
      raf = requestAnimationFrame(loop)
      // Analiza co drugą klatkę (~30×/s), jak w stroiku – oszczędza baterię.
      if (frame++ % 2) return
      // Własne dźwięki aplikacji to nie gra na gitarze.
      if (isReferenceTonePlaying(ctx) || isClickSounding(ctx)) return

      mic.analyser.getFloatTimeDomainData(buffer)
      const heard = rms(buffer) >= SILENCE_RMS && isGuitarPitch(detectPitch(buffer, ctx.sampleRate))
      const now = performance.now()
      tracker.update(now, heard)
      save(tracker.takeFullMinutes() * 60)

      setPlaying(tracker.isPlaying(now))
      setUnsavedSeconds(tracker.pendingSeconds())
      setSessionSeconds(savedSeconds + tracker.pendingSeconds())
    }

    const wakeLock = keepScreenOn()
    document.addEventListener('visibilitychange', onHide)
    stopRef.current = () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onHide)
      wakeLock.release()
      mic.stop()
      save(tracker.takeRest())
    }
    setStatus('listening')
    loop()
  }, [addEvents, profileId])

  const stop = useCallback(() => {
    stopRef.current?.()
    stopRef.current = null
    setStatus('idle')
    setPlaying(false)
    setUnsavedSeconds(0)
  }, [])

  // Zmiana osoby albo wylogowanie – zakończ sesję i zapisz resztę.
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      stopRef.current?.()
      stopRef.current = null
    }
  }, [])

  return { status, error, playing, sessionSeconds, unsavedSeconds, start, stop }
}
