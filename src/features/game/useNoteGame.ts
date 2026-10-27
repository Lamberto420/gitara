import { useCallback, useEffect, useRef, useState } from 'react'
import { resumeAudio } from '../../audio/audioContext'
import { isChimePlaying, playChime } from '../../audio/chime'
import { isClickSounding } from '../../audio/metronome/click'
import { microphoneErrorMessage, openMicrophone } from '../../audio/microphone'
import { createMedianFilter } from '../../audio/pitch/median'
import { detectPitch, rms } from '../../audio/pitch/yin'
import { isReferenceTonePlaying } from '../../audio/referenceTone'
import { createNoteListener } from '../../game/noteListener'
import { currentNote, hit, isFinished, miss, newRound, roundXp, type LevelId, type Round } from '../../game/round'
import { noteGameEvent } from '../../progress/events'
import { usePracticeSession } from '../practice/PracticeContext'
import { useProfiles } from '../profiles/ProfileContext'

/** Ta sama granica ciszy co w stroiku. */
const SILENCE_RMS = 0.01
/** Tyle trwa „brawo” po trafieniu (zielona nuta, gryf na trudnym), zanim pojawi się następna. */
const REVEAL_MS = 900

export type GamePhase =
  | { name: 'menu' }
  | { name: 'starting'; level: LevelId }
  | { name: 'playing'; round: Round; revealed: boolean; wrong: number | null }
  | { name: 'done'; round: Round; xp: number }
  | { name: 'error'; message: string }

/**
 * Gra „Zagraj nutę”: mikrofon słucha, a noteListener rozstrzyga trafienie/pomyłkę.
 * Start rundy włącza też „Ćwiczę 🎸”, żeby czas gry liczył się do celu dziennego.
 * Zdarzenie z nutkami zapisujemy dopiero po ukończonej rundzie (przerwana = bez nutek).
 */
export function useNoteGame() {
  const { activeProfile, addEvents } = useProfiles()
  const practice = usePracticeSession()
  const [phase, setPhase] = useState<GamePhase>({ name: 'menu' })
  const stopRef = useRef<(() => void) | null>(null)
  const aliveRef = useRef(true)

  const stop = useCallback(() => {
    stopRef.current?.()
    stopRef.current = null
  }, [])

  const start = useCallback(
    async (level: LevelId) => {
      stop()
      if (!activeProfile) return
      const profileId = activeProfile.id
      setPhase({ name: 'starting', level })
      if (practice.status === 'idle' || practice.status === 'error') void practice.start()

      let ctx: AudioContext
      let mic: Awaited<ReturnType<typeof openMicrophone>>
      try {
        ctx = await resumeAudio()
        mic = await openMicrophone(ctx)
        if (!aliveRef.current) return mic.stop()
      } catch (e) {
        setPhase({ name: 'error', message: microphoneErrorMessage(e) })
        return
      }

      let round = newRound(level)
      let listener = createNoteListener(currentNote(round)!.midi)
      let revealUntil = 0
      let wrong: number | null = null
      const buffer = new Float32Array(mic.analyser.fftSize)
      const median = createMedianFilter(5)
      let frame = 0
      let raf = 0
      const show = (revealed: boolean) => setPhase({ name: 'playing', round, revealed, wrong })

      const loop = () => {
        raf = requestAnimationFrame(loop)
        const now = performance.now()
        if (revealUntil) {
          if (now < revealUntil) return
          // Koniec „brawo” – następna nuta. Poprzednia może jeszcze brzmieć: ignore.
          const prev = round.notes[round.index - 1].midi
          revealUntil = 0
          if (isFinished(round)) return finish()
          listener = createNoteListener(currentNote(round)!.midi, prev)
          median.reset()
          show(false)
        }
        if (frame++ % 2) return
        // Własne dźwięki aplikacji to nie gra na gitarze.
        if (isReferenceTonePlaying(ctx) || isClickSounding(ctx) || isChimePlaying(ctx)) return

        mic.analyser.getFloatTimeDomainData(buffer)
        const raw = rms(buffer) >= SILENCE_RMS ? detectPitch(buffer, ctx.sampleRate) : null
        if (raw === null) median.reset()
        const heard = listener.update(now, raw === null ? null : median.push(raw))
        if (heard?.kind === 'hit') {
          playChime(ctx)
          round = hit(round)
          wrong = null
          revealUntil = now + REVEAL_MS
          show(true)
        } else if (heard?.kind === 'wrong') {
          round = miss(round)
          wrong = heard.midi
          show(false)
        }
      }

      const finish = () => {
        stop()
        const xp = roundXp(level, round.firstTry)
        addEvents([noteGameEvent(profileId, { level, notes: round.notes.length, firstTry: round.firstTry, xp })])
        setPhase({ name: 'done', round, xp })
      }

      stopRef.current = () => {
        cancelAnimationFrame(raf)
        mic.stop()
      }
      show(false)
      loop()
    },
    [activeProfile, addEvents, practice, stop],
  )

  /** Przerwanie rundy – bez nutek, powrót do wyboru poziomu. */
  const quit = useCallback(() => {
    stop()
    setPhase({ name: 'menu' })
  }, [stop])

  // Wyjście z zakładki gry wyłącza mikrofon (sesja „Ćwiczę” trwa dalej).
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      stop()
    }
  }, [stop])

  return { phase, start, quit }
}
