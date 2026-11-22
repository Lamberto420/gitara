import { useCallback, useEffect, useRef, useState } from 'react'
import { playChime } from '../../audio/chime'
import { microphoneErrorMessage } from '../../audio/microphone'
import { createNoteListener } from '../../game/noteListener'
import {
  isRunFinished,
  newSongRun,
  runHint,
  runHit,
  runMiss,
  runNote,
  runResult,
  type SongMode,
  type SongRun,
  type SongScope,
} from '../../game/songRun'
import type { Song } from '../../music/song'
import { eventXp, isCrown } from '../../progress/events'
import { songResultEvents } from '../../progress/songPath'
import { startPitchLoop, type PitchLoop } from '../game/pitchLoop'
import { usePracticeSession } from '../practice/PracticeContext'
import { useProfiles } from '../profiles/ProfileContext'

export type SongPhase =
  | { name: 'idle' }
  | { name: 'starting' }
  | { name: 'playing'; run: SongRun; wrong: number | null; hinted: boolean }
  | { name: 'done'; run: SongRun; xp: number; newCrown: number }
  | { name: 'error'; message: string }

/**
 * Granie piosenki: mikrofon słucha, noteListener rozstrzyga każdą nutę po kolei. Po trafieniu
 * od razu następna (bez pauzy na „brawo”), a powtórzoną nutę zalicza dopiero nowe szarpnięcie.
 * Start włącza „Ćwiczę 🎸”. Zdarzenia (nutki, nowe korony) zapisujemy po skończonym podejściu.
 */
export function useSongPlay() {
  const { activeProfile, addEvents, data } = useProfiles()
  const practice = usePracticeSession()
  const [phase, setPhase] = useState<SongPhase>({ name: 'idle' })
  const stopRef = useRef<(() => void) | null>(null)
  const hintRef = useRef<(() => void) | null>(null)
  const aliveRef = useRef(true)
  // Korony sprawdzamy na najnowszych danych z chwili końca – nie z chwili startu.
  const eventsRef = useRef(data.events)
  eventsRef.current = data.events

  const stop = useCallback(() => {
    stopRef.current?.()
    stopRef.current = null
    hintRef.current = null
  }, [])

  const start = useCallback(
    async (song: Song, mode: SongMode, scope: SongScope) => {
      stop()
      if (!activeProfile) return
      const profileId = activeProfile.id
      setPhase({ name: 'starting' })
      if (practice.status === 'idle' || practice.status === 'error') void practice.start()

      let run = newSongRun(song, mode, scope)
      let listener = createNoteListener(runNote(run)!.note.midi)
      let wrong: number | null = null
      let hinted = false
      let pitch: PitchLoop | null = null
      const show = () => setPhase({ name: 'playing', run, wrong, hinted })

      const finish = () => {
        const ctx = pitch?.ctx
        stop()
        if (ctx) playChime(ctx)
        const events = songResultEvents(profileId, runResult(run), eventsRef.current)
        addEvents(events)
        const crowns = events.filter(isCrown).map((e) => e.crown)
        setPhase({
          name: 'done',
          run,
          xp: events.reduce((sum, e) => sum + eventXp(e), 0),
          newCrown: crowns.length ? Math.max(...crowns) : 0,
        })
      }

      const onReading = (now: number, freq: number | null, level: number) => {
        const heard = listener.update(now, freq, level)
        if (heard?.kind === 'hit') {
          const prev = runNote(run)!.note.midi
          run = runHit(run)
          wrong = null
          hinted = false
          if (isRunFinished(run)) return finish()
          // Poprzednia nuta jeszcze brzmi – nie jest pomyłką, a ta sama zaliczy się po nowym szarpnięciu.
          listener = createNoteListener(runNote(run)!.note.midi, prev)
          pitch?.resetFilter()
          show()
        } else if (heard?.kind === 'wrong') {
          run = runMiss(run)
          wrong = heard.midi
          show()
        }
      }

      try {
        pitch = await startPitchLoop(onReading)
        if (!aliveRef.current) return pitch.stop()
      } catch (e) {
        setPhase({ name: 'error', message: microphoneErrorMessage(e) })
        return
      }
      const loop = pitch
      stopRef.current = () => loop.stop()
      hintRef.current = () => {
        if (hinted) return
        run = runHint(run)
        hinted = true
        show()
      }
      show()
    },
    [activeProfile, addEvents, practice, stop],
  )

  /** Przerwanie – bez nutek. */
  const quit = useCallback(() => {
    stop()
    setPhase({ name: 'idle' })
  }, [stop])

  // Wyjście z ekranu wyłącza mikrofon (sesja „Ćwiczę” trwa dalej).
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      stop()
    }
  }, [stop])

  const showHint = useCallback(() => hintRef.current?.(), [])

  return { phase, start, quit, showHint }
}
