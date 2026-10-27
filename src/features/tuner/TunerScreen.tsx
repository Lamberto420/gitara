import { useEffect, useRef, useState } from 'react'
import { resumeAudio } from '../../audio/audioContext'
import { analyze, type GuitarString, type TuneStatus } from '../../audio/pitch/notes'
import { playReferenceTone } from '../../audio/referenceTone'
import { XP_TUNED, tunedEvent, tunedEventId } from '../../progress/events'
import { createTuningChecklist } from '../../progress/tuningChecklist'
import { useProfiles } from '../profiles/ProfileContext'
import { useToday } from '../progress/useProgress'
import Needle from './Needle'
import StringButtons from './StringButtons'
import { useTuner } from './useTuner'

const MESSAGES: Record<TuneStatus, { low: string; high: string }> = {
  'in-tune': { low: 'Super! Nastrojone 🎉', high: 'Super! Nastrojone 🎉' },
  close: { low: 'Prawie! Odrobinę naciągnij ⬆️', high: 'Prawie! Odrobinę poluzuj ⬇️' },
  far: { low: 'Za nisko – naciągnij strunę ⬆️', high: 'Za wysoko – poluzuj strunę ⬇️' },
}

export default function TunerScreen() {
  const { state, start, stop } = useTuner()
  const [locked, setLocked] = useState<GuitarString | null>(null)
  const { tuned, complete, rewarded } = useTuningReward(state.status === 'listening' ? state.freq : null, locked)

  const selectString = async (string: GuitarString | null) => {
    setLocked(string)
    if (string) playReferenceTone(await resumeAudio(), string.freq)
  }

  if (state.status !== 'listening') {
    return (
      <section className="tuner">
        <p className="hint">Połóż telefon lub laptop blisko gitary.</p>
        <button className="big-button" onClick={start} disabled={state.status === 'starting'}>
          🎤 Włącz stroik
        </button>
        {state.status === 'error' && <p className="error">{state.message}</p>}
        <p className="hint">Dotknij struny, żeby usłyszeć, jak powinna brzmieć:</p>
        <StringButtons locked={locked} detected={null} tuned={tuned} onSelect={selectString} />
      </section>
    )
  }

  const freq = state.freq
  const reading = freq !== null ? analyze(freq, locked) : null
  const status = reading && !reading.wrongString ? reading.status : null

  return (
    <section className={`tuner ${status ?? ''}`}>
      <Needle cents={status ? reading!.cents : null} status={status} />
      {reading ? (
        <>
          <div className="note">{reading.string.name}</div>
          <div className="string-label">Struna {reading.string.number}</div>
          {reading.wrongString ? (
            <p className="message">To chyba inna struna 🤔</p>
          ) : (
            <p className={`message ${reading.status}`}>
              {reading.cents < 0 ? MESSAGES[reading.status].low : MESSAGES[reading.status].high}
            </p>
          )}
          <p className="details">
            {freq!.toFixed(1)} Hz · {reading.cents > 0 ? '+' : ''}
            {reading.cents.toFixed(0)} centów
          </p>
        </>
      ) : (
        <>
          <div className="note muted">{locked?.name ?? '?'}</div>
          <div className="string-label">{locked ? `Struna ${locked.number}` : ' '}</div>
          <p className="message">Zagraj {locked ? 'tę strunę' : 'jedną strunę'} 🎵</p>
          <p className="details">&nbsp;</p>
        </>
      )}
      {complete ? (
        <p className="tuned-banner">🎉 Cała gitara nastrojona!{rewarded && ` +${XP_TUNED} ⭐`}</p>
      ) : (
        <p className="hint">Nastrój wszystkie struny {tuned.size > 0 && `(${tuned.size}/6 ✅)`}</p>
      )}
      <StringButtons locked={locked} detected={reading?.string ?? null} tuned={tuned} onSelect={selectString} />
      <button className="small-button" onClick={stop}>
        Wyłącz stroik
      </button>
    </section>
  )
}

/**
 * Zalicza struny brzmiące czysto; po komplecie dopisuje zdarzenie „nastrojone” (+3 ⭐ raz dziennie –
 * id z osoby i dnia, więc ponowne strojenie tego samego dnia już nic nie dodaje).
 */
function useTuningReward(freq: number | null, locked: GuitarString | null) {
  const { data, activeProfile, addEvents } = useProfiles()
  const today = useToday()
  const checklistRef = useRef(createTuningChecklist())
  const [tuned, setTuned] = useState<ReadonlySet<number>>(new Set())
  /** Czy nutki wpadły w tej sesji stroika (a nie np. rano) – wtedy pokazujemy „+3 ⭐”. */
  const [rewarded, setRewarded] = useState(false)

  // Sprawdzamy co 100 ms, a nie przy zmianie freq: równy dźwięk daje ten sam odczyt
  // (React nie odświeża), a odliczanie „0,7 s czysto” musi mimo to płynąć.
  const readingRef = useRef({ freq, locked })
  readingRef.current = { freq, locked }
  useEffect(() => {
    const timer = setInterval(() => {
      const { freq, locked } = readingRef.current
      const reading = freq !== null ? analyze(freq, locked) : null
      const inTune = reading !== null && !reading.wrongString && reading.status === 'in-tune'
      const next = checklistRef.current.update(reading?.string.number ?? null, inTune, performance.now())
      setTuned((prev) => (next.size !== prev.size ? new Set(next) : prev))
    }, 100)
    return () => clearInterval(timer)
  }, [])

  const complete = tuned.size === 6
  useEffect(() => {
    if (!complete || !activeProfile) return
    if (data.events.some((e) => e.id === tunedEventId(activeProfile.id, today))) return
    addEvents([tunedEvent(activeProfile.id)])
    setRewarded(true)
  }, [complete, activeProfile, data.events, today, addEvents])

  return { tuned, complete, rewarded }
}
