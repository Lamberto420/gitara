import { cents, nearestString, tuneStatus, type TuneStatus } from '../../audio/pitch/notes'
import Needle from './Needle'
import { useTuner } from './useTuner'

const MESSAGES: Record<TuneStatus, { low: string; high: string }> = {
  'in-tune': { low: 'Super! Nastrojone 🎉', high: 'Super! Nastrojone 🎉' },
  close: { low: 'Prawie! Odrobinę naciągnij ⬆️', high: 'Prawie! Odrobinę poluzuj ⬇️' },
  far: { low: 'Za nisko – naciągnij strunę ⬆️', high: 'Za wysoko – poluzuj strunę ⬇️' },
}

export default function TunerScreen() {
  const { state, start, stop } = useTuner()

  if (state.status === 'idle' || state.status === 'starting' || state.status === 'error') {
    return (
      <section className="tuner">
        <p className="hint">Połóż telefon lub laptop blisko gitary.</p>
        <button className="big-button" onClick={start} disabled={state.status === 'starting'}>
          🎤 Włącz stroik
        </button>
        {state.status === 'error' && <p className="error">{state.message}</p>}
      </section>
    )
  }

  const freq = state.freq
  const string = freq !== null ? nearestString(freq) : null
  const c = freq !== null && string ? cents(freq, string.freq) : null
  const status = c !== null ? tuneStatus(c) : null

  return (
    <section className={`tuner ${status ?? ''}`}>
      <Needle cents={c} status={status} />
      {string && c !== null && status ? (
        <>
          <div className="note">{string.name}</div>
          <div className="string-label">Struna {string.number}</div>
          <p className={`message ${status}`}>{c < 0 ? MESSAGES[status].low : MESSAGES[status].high}</p>
          <p className="details">
            {freq!.toFixed(1)} Hz · {c > 0 ? '+' : ''}
            {c.toFixed(0)} centów
          </p>
        </>
      ) : (
        <>
          <div className="note muted">?</div>
          <p className="message">Zagraj jedną strunę 🎵</p>
        </>
      )}
      <button className="small-button" onClick={stop}>
        Wyłącz stroik
      </button>
    </section>
  )
}
