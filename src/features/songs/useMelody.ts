import { useCallback, useEffect, useRef, useState } from 'react'
import { resumeAudio } from '../../audio/audioContext'
import { midiToFreq } from '../../audio/pitch/notes'
import { playPluck } from '../../audio/referenceTone'
import { melodySchedule } from '../../music/melody'
import { phraseNotes, type Song } from '../../music/song'

/** Mała chwila na start, żeby pierwsza nuta nie była ucięta. */
const LEAD_S = 0.1

export interface MelodyPosition {
  phrase: number
  note: number
}

/**
 * „Posłuchaj”: odgrywa frazy piosenki w jej tempie i podaje, która nuta właśnie brzmi
 * (podświetlenie na pięciolinii). Przy okazji do sprawdzenia melodii na ucho.
 */
export function useMelody() {
  const [position, setPosition] = useState<MelodyPosition | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  const stop = useCallback(() => {
    stopRef.current?.()
    stopRef.current = null
    setPosition(null)
  }, [])

  const play = useCallback(
    async (song: Song, phrases: readonly number[]) => {
      stop()
      const ctx = await resumeAudio()
      const items = phrases.flatMap((p) => song.phrases[p].items)
      // Numer nuty w całym fragmencie → fraza i nuta w niej.
      const where: MelodyPosition[] = phrases.flatMap((p) => phraseNotes(song.phrases[p]).map((_, note) => ({ phrase: p, note })))
      const schedule = melodySchedule(items, song.bpm)
      const t0 = ctx.currentTime + LEAD_S
      const silencers = schedule.map((n) => playPluck(ctx, midiToFreq(n.midi), t0 + n.start, n.duration))
      const timers = schedule.map((n) => window.setTimeout(() => setPosition(where[n.index]), (LEAD_S + n.start) * 1000))
      // Koniec podświetlania po ostatniej nucie (jej wybrzmiewanie nie musi trzymać przycisku „Zatrzymaj”).
      const last = schedule[schedule.length - 1]
      timers.push(window.setTimeout(() => setPosition(null), (LEAD_S + last.start + 1) * 1000))
      stopRef.current = () => {
        timers.forEach((t) => window.clearTimeout(t))
        silencers.forEach((s) => s())
      }
    },
    [stop],
  )

  useEffect(() => stop, [stop])

  return { position, play, stop }
}
