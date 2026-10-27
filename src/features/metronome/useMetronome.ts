import { useCallback, useEffect, useRef, useState } from 'react'
import { resumeAudio } from '../../audio/audioContext'
import { playClick } from '../../audio/metronome/click'
import { clampBpm, createScheduler, type Beat } from '../../audio/metronome/scheduler'
import { load, save } from '../../storage'
import { keepScreenOn } from './wakeLock'

export const BEATS_PER_BAR_OPTIONS = [2, 3, 4] as const

interface Settings {
  bpm: number
  beatsPerBar: number
}

const DEFAULT_SETTINGS: Settings = { bpm: 80, beatsPerBar: 4 }
/** Co ile ms timer budzi harmonogram (planuje on 100 ms do przodu, więc jest zapas). */
const TICK_MS = 25

function loadSettings(): Settings {
  const s = load('metronome', DEFAULT_SETTINGS)
  return {
    bpm: clampBpm(Number(s.bpm) || DEFAULT_SETTINGS.bpm),
    beatsPerBar: BEATS_PER_BAR_OPTIONS.includes(s.beatsPerBar as 2 | 3 | 4) ? s.beatsPerBar : 4,
  }
}

export function useMetronome() {
  const [settings, setSettings] = useState(loadSettings)
  const [playing, setPlaying] = useState(false)
  /** Które uderzenie taktu właśnie słychać (do migania kropek). */
  const [currentBeat, setCurrentBeat] = useState<number | null>(null)

  const settingsRef = useRef(settings)
  const schedulerRef = useRef<ReturnType<typeof createScheduler> | null>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const startingRef = useRef(false)

  useEffect(() => {
    settingsRef.current = settings
    save('metronome', settings)
    schedulerRef.current?.setBpm(settings.bpm)
    schedulerRef.current?.setBeatsPerBar(settings.beatsPerBar)
  }, [settings])

  const start = useCallback(async () => {
    if (startingRef.current || stopRef.current) return
    startingRef.current = true
    const ctx = await resumeAudio()

    // Kolejka zaplanowanych (jeszcze niesłyszanych) uderzeń – dla kropek i do wyciszenia przy stopie.
    const queue: { beat: Beat; osc: OscillatorNode }[] = []
    const scheduler = createScheduler({
      now: () => ctx.currentTime,
      playBeat: (beat) => queue.push({ beat, osc: playClick(ctx, beat.time, beat.accent) }),
      ...settingsRef.current,
    })
    scheduler.start()
    scheduler.tick()
    const timer = setInterval(scheduler.tick, TICK_MS)

    // Kropka zapala się, gdy dźwięk faktycznie wychodzi z głośnika
    // (outputLatency – opóźnienie np. słuchawek Bluetooth; Safari go nie podaje).
    let frame = 0
    const draw = () => {
      frame = requestAnimationFrame(draw)
      const heardUntil = ctx.currentTime - (ctx.outputLatency || 0)
      let heard: Beat | null = null
      while (queue.length && queue[0].beat.time <= heardUntil) heard = queue.shift()!.beat
      if (heard) setCurrentBeat(heard.index)
    }
    draw()

    const wakeLock = keepScreenOn()
    schedulerRef.current = scheduler
    stopRef.current = () => {
      clearInterval(timer)
      cancelAnimationFrame(frame)
      queue.forEach(({ osc }) => osc.stop()) // wycisz kliknięcia zaplanowane „na zapas”
      wakeLock.release()
      schedulerRef.current = null
    }
    startingRef.current = false
    setPlaying(true)
  }, [])

  const stop = useCallback(() => {
    stopRef.current?.()
    stopRef.current = null
    setPlaying(false)
    setCurrentBeat(null)
  }, [])

  // Zatrzymaj metronom po przejściu na inną zakładkę aplikacji.
  useEffect(() => () => stopRef.current?.(), [])

  const setBpm = useCallback((bpm: number) => setSettings((s) => ({ ...s, bpm: clampBpm(bpm) })), [])
  const setBeatsPerBar = useCallback(
    (beatsPerBar: number) => setSettings((s) => ({ ...s, beatsPerBar })),
    [],
  )

  return { ...settings, playing, currentBeat, start, stop, setBpm, setBeatsPerBar }
}
