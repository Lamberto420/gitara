import { useCallback, useEffect, useRef, useState } from 'react'
import { playChime } from '../../audio/chime'
import { microphoneErrorMessage } from '../../audio/microphone'
import { createNoteListener } from '../../game/noteListener'
import { currentNote, hint, hit, isFinished, miss, newRound, roundXp, type LevelId, type Round } from '../../game/round'
import { noteGameEvent } from '../../progress/events'
import { usePracticeSession } from '../practice/PracticeContext'
import { useProfiles } from '../profiles/ProfileContext'
import { startPitchLoop, type PitchLoop } from './pitchLoop'

/** Tyle trwa „brawo” po trafieniu (zielona nuta, gryf na trudnym), zanim pojawi się następna. */
const REVEAL_MS = 900

export type GamePhase =
  | { name: 'menu' }
  | { name: 'starting'; level: LevelId }
  | { name: 'playing'; round: Round; revealed: boolean; wrong: number | null; hinted: boolean }
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
  /** Pokazanie podpowiedzi w trwającej rundzie (runda żyje w pętli mikrofonu, nie w stanie Reacta). */
  const hintRef = useRef<(() => void) | null>(null)
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

      let round = newRound(level)
      let listener = createNoteListener(currentNote(round)!.midi)
      let revealUntil = 0
      let wrong: number | null = null
      let hinted = false
      let pitch: PitchLoop | null = null
      const show = (revealed: boolean) => setPhase({ name: 'playing', round, revealed, wrong, hinted })

      /** Pauza na „brawo” po trafieniu – mikrofon wtedy nie słucha. */
      const onFrame = (now: number) => {
        if (!revealUntil) return false
        if (now < revealUntil) return true
        // Koniec „brawo” – następna nuta. Poprzednia może jeszcze brzmieć: ignore.
        const prev = round.notes[round.index - 1].midi
        revealUntil = 0
        if (isFinished(round)) {
          finish()
          return true
        }
        listener = createNoteListener(currentNote(round)!.midi, prev)
        pitch?.resetFilter()
        hinted = false
        show(false)
        return false
      }

      const onReading = (now: number, freq: number | null) => {
        const heard = listener.update(now, freq)
        if (heard?.kind === 'hit') {
          if (pitch) playChime(pitch.ctx)
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

      hintRef.current = () => {
        if (revealUntil || hinted) return
        round = hint(round)
        hinted = true
        show(false)
      }
      try {
        pitch = await startPitchLoop(onReading, onFrame)
        if (!aliveRef.current) return pitch.stop()
      } catch (e) {
        setPhase({ name: 'error', message: microphoneErrorMessage(e) })
        return
      }
      const loop = pitch
      stopRef.current = () => {
        loop.stop()
        hintRef.current = null
      }
      show(false)
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

  const showHint = useCallback(() => hintRef.current?.(), [])

  return { phase, start, quit, showHint }
}
