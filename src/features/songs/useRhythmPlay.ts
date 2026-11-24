import { useCallback, useEffect, useRef, useState } from 'react'
import { resumeAudio } from '../../audio/audioContext'
import { playChime } from '../../audio/chime'
import { playClick } from '../../audio/metronome/click'
import { microphoneErrorMessage, openMicrophone, type Microphone } from '../../audio/microphone'
import { createOnsetDetector } from '../../audio/onsets'
import { freqToMidi } from '../../audio/pitch/notes'
import {
  gradeRhythm,
  rhythmPlan,
  rhythmPosition,
  rhythmResult,
  type Heard,
  type RhythmGrade,
  type RhythmPlan,
  type RhythmTempo,
} from '../../game/rhythmRun'
import type { SongScope } from '../../game/songRun'
import type { Song } from '../../music/song'
import { eventXp, isCrown } from '../../progress/events'
import { songResultEvents } from '../../progress/songPath'
import { usePracticeSession } from '../practice/PracticeContext'
import { useProfiles } from '../profiles/ProfileContext'

/** Chwila na start (mikrofon, podsłuch) przed pierwszym tykiem. */
const LEAD_S = 0.5
/** Tyki planujemy na bieżąco z takim wyprzedzeniem – po „Zakończ” żaden już nie zagra. */
const CLICK_AHEAD_S = 0.15
/** Nutę oceniamy na ekranie, gdy minie jej czas + opóźnienie + okno + ocena wykrywacza. */
const REVEAL_S = 0.5

export type RhythmPhase =
  | { name: 'idle' }
  | { name: 'starting' }
  | {
      name: 'playing'
      plan: RhythmPlan
      /** Takt wejścia: która to ćwierćnuta (1, 2, 3…); null, gdy już gramy. */
      countIn: number | null
      /** Bieżąca nuta (indeks w planie) albo null w takcie wejścia. */
      position: number | null
      grade: RhythmGrade
      /** Ile pierwszych nut już ocenionych (widać ich kolor). */
      judged: number
    }
  | { name: 'done'; plan: RhythmPlan; grade: RhythmGrade; xp: number; newCrown: number }
  | { name: 'error'; message: string }

/**
 * Gra w rytmie: takt wejścia, potem nuty lecą w tempie – metronom nie czeka. Szarpnięcia z mikrofonu
 * (co do próbki, `audio/onsets`) oceniamy na bieżąco, a po ostatniej nucie zapisujemy wynik.
 * Start włącza „Ćwiczę 🎸”, jak zwykła piosenka.
 */
export function useRhythmPlay() {
  const { activeProfile, addEvents, data } = useProfiles()
  const practice = usePracticeSession()
  const [phase, setPhase] = useState<RhythmPhase>({ name: 'idle' })
  const stopRef = useRef<(() => void) | null>(null)
  const aliveRef = useRef(true)
  const eventsRef = useRef(data.events)
  eventsRef.current = data.events

  const stop = useCallback(() => {
    stopRef.current?.()
    stopRef.current = null
  }, [])

  const start = useCallback(
    async (song: Song, scope: SongScope, tempo: RhythmTempo) => {
      stop()
      if (!activeProfile) return
      const profileId = activeProfile.id
      setPhase({ name: 'starting' })
      // Najpierw dźwięk – jeszcze w geście kliknięcia (Safari).
      const ctx = await resumeAudio()
      if (practice.status === 'idle' || practice.status === 'error') void practice.start()

      const plan = rhythmPlan(song, scope, tempo)
      const detector = createOnsetDetector(ctx.sampleRate)
      let opened: Microphone | null = null
      try {
        opened = await openMicrophone(ctx)
        await opened.tap((frame, samples) => detector.push(frame, samples))
      } catch (e) {
        opened?.stop() // mikrofon otwarty, a podsłuch nie – nie zostawiamy go włączonego
        setPhase({ name: 'error', message: microphoneErrorMessage(e) })
        return
      }
      const mic = opened
      if (!aliveRef.current) return mic.stop()

      const t0 = ctx.currentTime + LEAD_S
      const heard: Heard[] = []
      const beatsPerBar = plan.clicks.findIndex((c, i) => i > 0 && c.accent)
      let nextClick = 0
      let raf = 0
      let grade = gradeRhythm(plan, heard)
      let shown = ''

      const finish = () => {
        stop()
        playChime(ctx)
        const final = gradeRhythm(plan, heard)
        const events = songResultEvents(profileId, rhythmResult(plan, final), eventsRef.current)
        addEvents(events)
        const crowns = events.filter(isCrown).map((e) => e.crown)
        setPhase({
          name: 'done',
          plan,
          grade: final,
          xp: events.reduce((sum, e) => sum + eventXp(e), 0),
          newCrown: crowns.length ? Math.max(...crowns) : 0,
        })
      }

      const frame = () => {
        const now = ctx.currentTime - t0
        while (nextClick < plan.clicks.length && plan.clicks[nextClick].time < now + CLICK_AHEAD_S) {
          const c = plan.clicks[nextClick++]
          playClick(ctx, t0 + c.time, c.accent)
        }
        const fresh = detector.take().filter((o) => o.note)
        if (fresh.length) {
          for (const o of fresh) heard.push({ time: o.time - t0, midi: Math.round(freqToMidi(o.freq!)) })
          grade = gradeRhythm(plan, heard)
        }
        if (now >= plan.finishAt) return finish()

        const position = rhythmPosition(plan, now)
        const countIn = position === null && now >= 0 ? (Math.floor(now / plan.beat) % (beatsPerBar > 0 ? beatsPerBar : 4)) + 1 : null
        let judged = 0
        while (judged < plan.notes.length && plan.notes[judged].time + grade.offset + REVEAL_S <= now) judged++
        // Odświeżamy ekran tylko, gdy coś się zmieniło (nie 60 razy na sekundę).
        const key = `${position}|${countIn}|${judged}|${heard.length}`
        if (key !== shown) {
          shown = key
          setPhase({ name: 'playing', plan, countIn, position, grade, judged })
        }
        raf = requestAnimationFrame(frame)
      }

      stopRef.current = () => {
        cancelAnimationFrame(raf)
        mic.stop()
      }
      raf = requestAnimationFrame(frame)
    },
    [activeProfile, addEvents, practice, stop],
  )

  /** Przerwanie – bez nutek; zaplanowane są tylko najbliższe tyki, więc metronom od razu milknie. */
  const quit = useCallback(() => {
    stop()
    setPhase({ name: 'idle' })
  }, [stop])

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      stop()
    }
  }, [stop])

  return { phase, start, quit }
}
