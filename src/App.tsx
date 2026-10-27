import { useState } from 'react'
import TunerScreen from './features/tuner/TunerScreen'
import MetronomeScreen from './features/metronome/MetronomeScreen'

type Tab = 'tuner' | 'metronome'

export default function App() {
  const [tab, setTab] = useState<Tab>('tuner')

  return (
    <div className="app">
      <nav className="tabs">
        <button
          className={tab === 'tuner' ? 'tab active' : 'tab'}
          onClick={() => setTab('tuner')}
        >
          🎸 Stroik
        </button>
        <button
          className={tab === 'metronome' ? 'tab active' : 'tab'}
          onClick={() => setTab('metronome')}
        >
          🥁 Metronom
        </button>
      </nav>
      <main className="screen">
        {tab === 'tuner' ? <TunerScreen /> : <MetronomeScreen />}
      </main>
    </div>
  )
}
