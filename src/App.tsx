import { useState } from 'react'
import TunerScreen from './features/tuner/TunerScreen'
import MetronomeScreen from './features/metronome/MetronomeScreen'
import { ProfileProvider, useProfiles } from './features/profiles/ProfileContext'
import ProfileChip from './features/profiles/ProfileChip'
import ProfilePicker from './features/profiles/ProfilePicker'
import ProgressHeader from './features/progress/ProgressHeader'
import { useProgress } from './features/progress/useProgress'

type Tab = 'tuner' | 'metronome'

export default function App() {
  return (
    <ProfileProvider>
      <Shell />
    </ProfileProvider>
  )
}

function Shell() {
  const { activeProfile, selectProfile, saveFailed } = useProfiles()
  const { progress } = useProgress()
  const [tab, setTab] = useState<Tab>('tuner')

  return (
    <div className="app">
      {saveFailed && (
        <p className="error">⚠️ Nie udało się zapisać postępów na tym urządzeniu. Sprawdź, czy przeglądarka nie blokuje danych strony.</p>
      )}
      {!activeProfile ? (
        <ProfilePicker />
      ) : (
        <>
          <header className="header">
            <ProfileChip profile={activeProfile} onClick={() => selectProfile(null)} />
          </header>
          {progress && <ProgressHeader progress={progress} />}
          <nav className="tabs">
            <button className={tab === 'tuner' ? 'tab active' : 'tab'} onClick={() => setTab('tuner')}>
              🎸 Stroik
            </button>
            <button className={tab === 'metronome' ? 'tab active' : 'tab'} onClick={() => setTab('metronome')}>
              🥁 Metronom
            </button>
          </nav>
          {/* key: po zmianie osoby ekrany startują od nowa, z jej ustawieniami */}
          <main className="screen" key={activeProfile.id}>
            {tab === 'tuner' ? <TunerScreen /> : <MetronomeScreen />}
          </main>
        </>
      )}
    </div>
  )
}
