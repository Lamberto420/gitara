import { useRef } from 'react'
import { MAX_BPM, MIN_BPM } from '../../audio/metronome/scheduler'
import { createTapTempo } from '../../audio/metronome/tapTempo'
import { tempoName } from '../../audio/metronome/tempo'
import BeatDots from './BeatDots'
import { BEATS_PER_BAR_OPTIONS, useMetronome } from './useMetronome'

// Na iPhonie/iPadzie przełącznik wyciszenia ścisza też dźwięk ze stron WWW.
const isIOS =
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export default function MetronomeScreen() {
  const m = useMetronome()
  const tapper = useRef(createTapTempo())
  const tempo = tempoName(m.bpm)

  const tap = () => {
    const bpm = tapper.current.tap(performance.now())
    if (bpm !== null) m.setBpm(bpm)
  }

  return (
    <section className="metronome">
      <BeatDots beatsPerBar={m.beatsPerBar} currentBeat={m.currentBeat} />

      <div className="bpm">
        <span className="bpm-value">{m.bpm}</span>
        <span className="bpm-unit">uderzeń na minutę</span>
      </div>
      <p className="tempo-name">
        <strong>{tempo.name}</strong> – {tempo.description}
      </p>

      <div className="bpm-controls">
        <button className="round-button" onClick={() => m.setBpm(m.bpm - 5)} aria-label="Wolniej o 5">
          −5
        </button>
        <button className="round-button small" onClick={() => m.setBpm(m.bpm - 1)} aria-label="Wolniej o 1">
          −1
        </button>
        <button className="round-button small" onClick={() => m.setBpm(m.bpm + 1)} aria-label="Szybciej o 1">
          +1
        </button>
        <button className="round-button" onClick={() => m.setBpm(m.bpm + 5)} aria-label="Szybciej o 5">
          +5
        </button>
      </div>
      <input
        className="bpm-slider"
        type="range"
        min={MIN_BPM}
        max={MAX_BPM}
        value={m.bpm}
        onChange={(e) => m.setBpm(Number(e.target.value))}
        aria-label="Tempo"
      />

      <button className={m.playing ? 'big-button stop' : 'big-button'} onClick={m.playing ? m.stop : m.start}>
        {m.playing ? '⏹ Stop' : '▶️ Start'}
      </button>

      <div className="metre">
        <span className="metre-label">Metrum:</span>
        {BEATS_PER_BAR_OPTIONS.map((n) => (
          <button
            key={n}
            className={m.beatsPerBar === n ? 'metre-button selected' : 'metre-button'}
            onClick={() => m.setBeatsPerBar(n)}
          >
            {n}/4
          </button>
        ))}
      </div>

      {/* onPointerDown, nie onClick: liczy się moment dotknięcia, a nie puszczenia palca */}
      <button className="tap-button" onPointerDown={tap}>
        👆 Stukaj w rytm
      </button>

      {isIOS && m.playing && (
        <p className="hint small">Nie słychać? Sprawdź przełącznik wyciszenia z boku iPhone'a/iPada.</p>
      )}
    </section>
  )
}
