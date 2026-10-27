import { useState } from 'react'
import { resumeAudio } from '../../audio/audioContext'
import { analyze, type GuitarString, type TuneStatus } from '../../audio/pitch/notes'
import { playReferenceTone } from '../../audio/referenceTone'
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
        <StringButtons locked={locked} detected={null} onSelect={selectString} />
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
      <StringButtons locked={locked} detected={reading?.string ?? null} onSelect={selectString} />
      <button className="small-button" onClick={stop}>
        Wyłącz stroik
      </button>
    </section>
  )
}
